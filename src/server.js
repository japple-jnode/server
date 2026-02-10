/*
@jnode/server/server.js
v2

Simple web server package for Node.js.

by JustApple
*/

// dependencies
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const stream = require('stream');
const EventEmitter = require('events');

// server class
class Server extends EventEmitter {
    constructor(router, options = {}) {
        super();

        this.router = router;
        this.options = options;

        // start a server
        this.server = options.enableHTTP2 ?
            ((options.key && options.cert) ?
                http2.createSecureServer(options) :
                http2.createServer(options)) :
            ((options.key && options.cert) ?
                https.createServer(options) :
                http.createServer(options));

        // request listener
        // HTTP/2 also use the same event with the node:http2 Compatibility API
        this.server.on('request', async (req, res) => {
            let url;

            try {
                url = new URL(req.url, `http${options.key && options.cert ? 's' : ''}://${req.headers.host || req.headers[':authority']}`);
            } catch (e) {
                this.emit('warn', e);
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('400 Bad Request', 'utf8');
                return;
            }

            // the context object, mainly for handlers
            const ctx = {
                req, res, url,
                server: this,
                path: url.pathname,
                host: url.hostname,
                method: req.method,
                headers: req.headers,
                identity: { address: req.socket.remoteAddress, port: req.socket.remotePort },
                params: Object.fromEntries(url.searchParams.entries()),
                body: req
            };

            // the environment object, mainly for routers
            const env = {
                path: url.pathname.split('/').slice(1).map((i) => { try { return decodeURIComponent(i); } catch { return i; } }),
                pathPointer: 0,
                host: url.hostname.split('.').filter(Boolean).reverse(),
                hostPointer: 0,
                codeHandlers: this.options.codeHandlers || {},
                i: 0
            };

            let handler;
            try {
                handler = await Server.route(this.router, env, ctx, this.options);
                if (handler === undefined || handler === null) handler = 404;
            } catch (e) { // error while routing
                this.emit('e', e, env, ctx);
                handler = 500;
            }

            await Server.handle(handler, env, ctx, this.options);
        });
    }

    // route
    static async route(router, env = {}, ctx = {}, options = {}) {
        let r = router;
        if (!env.i) env.i = 0;

        while (typeof r?.route === 'function') {
            env.i++;

            if (env.i > (options.maxRoutingSteps || 50)) return 508; // 508 Loop Detected

            r = await r.route(env, ctx);
        }

        return r;
    }

    // handle
    static async handle(handler, env = {}, ctx = {}, options = {}) {
        try {
            if (typeof handler?.handle === 'function') { // handler
                await handler.handle(ctx, env);
            } else if (typeof handler === 'function') { // function
                await handler(ctx, env);
            } else if (typeof handler === 'string') { // string
                const data = Buffer.from(handler, 'utf8');
                ctx.res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Content-Length': data.length
                });
                ctx.res.end(data);
            } else if (handler instanceof Uint8Array) { // buffer
                ctx.res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': handler.length
                });
                ctx.res.end(handler);
            } else if (stream.isReadable(handler)) { // stream
                ctx.res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                await stream.promises.pipeline(handler, ctx.res);
            } else if (typeof handler === 'number') { // status code
                const code = handler;
                handler = env.codeHandlers[code];

                // handlers without code handlers
                if (typeof handler?.handle === 'function') { // handler
                    await handler.handle(ctx, env);
                } else if (typeof handler === 'function') { // function
                    await handler(ctx, env);
                } else if (typeof handler === 'string') { // string
                    const data = Buffer.from(handler, 'utf8');
                    ctx.res.writeHead(code, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Content-Length': data.length
                    });
                    ctx.res.end(data);
                } else if (handler instanceof Uint8Array) { // buffer
                    ctx.res.writeHead(code, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': handler.length
                    });
                    ctx.res.end(handler);
                } else if (stream.isReadable(handler)) { // stream
                    ctx.res.writeHead(code, { 'Content-Type': 'application/octet-stream' });
                    await stream.promises.pipeline(handler, ctx.res);
                } else { // use default status code response
                    try { ctx.res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); } catch { }
                    try { ctx.res.end(`${code} ${http.STATUS_CODES[code] || 'Unknown'}`, 'utf8'); } catch { }
                }
            } else { // invalid handler
                throw new Error('JNS: Invalid handler returned from router.');
            }
        } catch (e) { // error while handling
            if (typeof e !== 'number') ctx.server.emit('e', e, env, ctx);

            try {
                const code = (typeof e === 'number') ? e : 500;
                handler = env.codeHandlers[code];

                // handlers without code handlers
                if (typeof handler?.handle === 'function') { // handler
                    await handler.handle(ctx, env);
                } else if (typeof handler === 'function') { // function
                    await handler(ctx, env);
                } else if (typeof handler === 'string') { // string
                    const data = Buffer.from(handler, 'utf8');
                    ctx.res.writeHead(code, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Content-Length': data.length
                    });
                    ctx.res.end(data);
                } else if (handler instanceof Uint8Array) { // buffer
                    ctx.res.writeHead(code, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': handler.length
                    });
                    ctx.res.end(handler);
                } else if (stream.isReadable(handler)) { // stream
                    ctx.res.writeHead(code, { 'Content-Type': 'application/octet-stream' });
                    await stream.promises.pipeline(handler, ctx.res);
                } else { // use default status code response
                    ctx.res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
                    ctx.res.end(`${code} ${http.STATUS_CODES[code] || 'Unknown'}`, 'utf8');
                }
            } catch (e) { // error while handling the error while handling :)
                ctx.server.emit('warn', e, env, ctx);
                try { ctx.res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); } catch { }
                try { ctx.res.end('500 Internal Server Error', 'utf8'); } catch { }
            }
        }
    }

    listen(...args) {
        this.server.listen(...args);
    }

    close(...args) {
        this.server.close(...args);
    }

    // throw an error event
    throw(...args) {
        this.emit('e', ...args);
    }
}

// create server
function createServer(router, options = {}) {
    return new Server(router, options);
}

// export
module.exports = {
    Server,
    createServer
};