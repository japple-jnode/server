/*
@jnode/server/handlers.js
v2

Simple web server package for Node.js.

by JustApple
*/

// dependencies
const stream = require('stream');
const fs = require('fs');
const mime = require('./mime.json');
const path = require('path');

// data handler: string, buffer, or stream
class DataHandler {
    constructor(data, options = {}) {
        this.data = data;
        this.options = options;
    }

    async handle(ctx, env) {
        if (typeof this.data === 'string') { // string
            ctx.res.writeHead(this.options.statusCode ?? 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': Buffer.byteLength(this.data, 'utf8'),
                ...this.options.headers
            });
            ctx.res.end(this.data, 'utf8');
        } else if (this.data instanceof Uint8Array) { // buffer
            ctx.res.writeHead(this.options.statusCode ?? 200, {
                'Content-Type': 'application/octet-stream',
                'Content-Length': this.data.length,
                ...this.options.headers
            });
            ctx.res.end(this.data);
        } else if (stream.isReadable(this.data)) { // stream
            ctx.res.writeHead(this.options.statusCode ?? 200, {
                'Content-Type': 'application/octet-stream',
                ...this.options.headers
            });

            try {
                await stream.promises.pipeline(this.data, ctx.res);
            } catch (e) {
                if (e.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
                throw e;
            }
        }
    }
}

// file handler: local file
class FileHandler {
    constructor(file, options = {}) {
        this.file = path.resolve(file);
        this.options = options;

        // range may be disabled by `options.disableRange` or when `statusCode` is set to non-200 value
        this.options.disableRange = this.options.disableRange || (this.options.statusCode && this.options.statusCode !== 200);
    }

    async handle(ctx, env) {
        let stats;
        try {
            stats = await fs.promises.stat(this.file);
        } catch { throw 404; }

        // folders are not allowed (if you need, try to make your own handler :D)
        if (!stats.isFile()) throw 404;

        // handle caching
        if (this.options.cache) {
            // set etag
            if (!this._etag) this._etag = this.options.headers?.['ETag'] ?? `"${stats.size}-${stats.mtime.getTime()}"`;

            // by etag
            if (ctx.req.headers['if-none-match'] === this._etag) {
                ctx.res.writeHead(304, {
                    'Last-Modified': stats.mtime.toUTCString(),
                    'ETag': this._etag,
                    ...this.options.headers
                });
                ctx.res.end();
                return;
            }

            // by mtime
            const since = new Date(ctx.req.headers['if-modified-since'] ?? 0).getTime();
            if (!isNaN(since) && stats.mtime.getTime() <= since) {
                ctx.res.writeHead(304, {
                    'Last-Modified': stats.mtime.toUTCString(),
                    'ETag': this._etag,
                    ...this.options.headers
                });
                ctx.res.end();
                return;
            }
        }

        // range
        let start = 0;
        let end = stats.size - 1;

        // parse range header
        let range = /^bytes=(\d*)-(\d*)$/.exec(ctx.req.headers.range || '');
        if (this.options.disableRange || !(ctx.method === 'GET' || ctx.method === 'HEAD')) range = null;
        if (range) {
            // cache check
            if (this.options.cache && ctx.req.headers['if-range']) {
                if (ctx.req.headers['if-range'].startsWith('"') && ctx.req.headers['if-range'].endsWith('"')) { // etag
                    if (ctx.req.headers['if-range'] !== this._etag) range = null;
                } else { // mtime
                    const since = new Date(ctx.req.headers['if-range']).getTime();
                    if (isNaN(since) || stats.mtime.getTime() > since) range = null;
                }
            }

            if (range[1] === '' && range[2] === '') throw 416; // invalid range

            if (range[1] === '' && range[2] !== '') {
                start = Math.max(stats.size - parseInt(range[2], 10), 0); // last n bytes
            } else {
                if (range[1] !== '') start = parseInt(range[1], 10);
                if (range[2] !== '') end = Math.min(parseInt(range[2], 10), stats.size - 1);
            }

            if (start > end) throw 416;
        }

        // headers
        ctx.res.writeHead(this.options.statusCode ?? (range ? 206 : 200), {
            'Content-Type': mime[path.extname(this.file)] || 'application/octet-stream',
            'Content-Length': range ? (end - start) + 1 : stats.size,
            'Last-Modified': stats.mtime.toUTCString(),
            ...(this._etag && { 'ETag': this._etag }),
            ...(this.options.cache && { 'Cache-Control': 'max-age=' + (this.options.cache === true ? 'no-cache' : this.options.cache) }), // cache
            ...(!this.options.disableRange && { 'Accept-Ranges': 'bytes' }),
            ...(range && { 'Content-Range': `bytes ${start}-${end}/${stats.size}` }),
            ...this.options.headers
        });

        // pipe stream or send with only headers
        if (ctx.method === 'HEAD' && !this.options.disableHead) {
            ctx.res.end();
        } else {
            // send with stream
            try {
                await stream.promises.pipeline(
                    fs.createReadStream(this.file, {
                        start, end,
                        highWaterMark: this.options.highWaterMark || 64 * 1024
                    }),
                    ctx.res
                );
            } catch (e) {
                if (e.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
                throw e;
            }
        }
    }
}

// folder handler: local folder, continues from env.path
class FolderHandler {
    constructor(folder, options = {}) {
        this.folder = path.resolve(folder);
        this.options = options;
    }

    handle(ctx, env) {
        const file = path.resolve(this.folder, ...env.path.slice(env.pathPointer));

        // safety check
        const rel = path.relative(this.folder, file);
        if (rel.startsWith('..') || path.isAbsolute(rel)) throw 404;

        // use a FileHandler
        return (new FileHandler(file, this.options)).handle(ctx, env);
    }
}

// JSON handler: JSON object
class JSONHandler {
    constructor(obj, options = {}) {
        this.obj = obj;
        this.options = options;
    }

    handle(ctx, env) {
        const data = JSON.stringify(this.obj);

        ctx.res.writeHead(this.options.statusCode ?? 200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(data, 'utf8'),
            ...this.options.headers
        });
        ctx.res.end(data, 'utf8');
    }
}

// redirect handler: 307 redirect
class RedirectHandler {
    constructor(location, options = {}) {
        this.location = location;
        this.options = options;
    }

    handle(ctx, env) {
        ctx.res.writeHead(this.options.statusCode ?? 307, {
            'Location': this.options.base ?
                this.options.base +
                (this.options.base.endsWith('/') ? '' : '/') +
                env.path.slice(env.pathPointer).map(encodeURIComponent).join('/') :
                this.location,
            ...this.options.headers
        });
        ctx.res.end();
    }
}

// function handler: custom function
class FunctionHandler {
    constructor(func) {
        this.func = func;
    }

    handle(ctx, env) {
        return this.func(ctx, env);
    }
}

// export
module.exports = {
    DataHandler, TextHandler: DataHandler, FileHandler, FolderHandler, JSONHandler, RedirectHandler, FunctionHandler,
    handlerConstructors: {
        Data: (...args) => new DataHandler(...args),
        Text: (...args) => new DataHandler(...args),
        File: (...args) => new FileHandler(...args),
        Folder: (...args) => new FolderHandler(...args),
        JSON: (...args) => new JSONHandler(...args),
        Redirect: (...args) => new RedirectHandler(...args),
        Function: (...args) => new FunctionHandler(...args)
    }
};