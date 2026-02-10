/*
@jnode/server/routers.js
v2

Simple web server package for Node.js.

by JustApple
*/

// path router: the most important router, routes the request by path
class PathRouter {
    constructor(end = 404, map = {}) {
        this.end = end;

        // parse map
        this.map = {};
        for (let [key, value] of Object.entries(map)) {
            // any path segment
            if (key === '*') {
                this.map['*'] = value;
                continue;
            }

            key = key.trimStart();

            const firstSlashIndex = key.indexOf('/');
            if (firstSlashIndex === -1) continue;

            // key format: '[@ (path end check)][METHOD (method check)]/path/segments'
            // example: '@ GET /cat/names', 'POST /cats', '/api'
            const routeEnd = key.startsWith('@');
            const routeMethod = key.substring(routeEnd ? 1 : 0, firstSlashIndex).trim();
            const routePath = key.substring(firstSlashIndex).split('/').slice(1);

            // expand map
            let current = this.map;
            let args = [];
            for (let segment of routePath) {
                if (segment.startsWith('%:')) {
                    args.push(segment.substring(2));
                    if (!current[':']) current[':'] = {};
                    current = current[':'];
                    continue;
                }

                segment = '/' + decodeURIComponent(segment);
                if (!current[segment]) current[segment] = {};
                current = current[segment];
            }

            // '*' for non-end check, '@' for end check
            // '*' for any method, 'METHOD' for specific method
            if (!current[routeEnd ? '@' : '*']) current[routeEnd ? '@' : '*'] = {};
            current[routeEnd ? '@' : '*'][routeMethod || '*'] = value;
            if (args.length > 0) current[routeEnd ? '@' : '*']['::' + (routeMethod || '*')] = args;
        }
    }

    route(env, ctx) {
        if (env.pathPointer >= env.path.length) return this.end;

        let result = this.map['*'];
        let resultPointer = env.pathPointer;
        let current = this.map;
        let currentArgs = [];
        let resultArgNames;
        while (env.pathPointer < env.path.length) {
            let segment = '/' + env.path[env.pathPointer];
            if (!current[segment] && !current[':']) break;
            if (!current[segment]) {
                segment = ':';
                currentArgs.push(env.path[env.pathPointer]);
            }

            // prepare fallback
            if (current[segment]['*']?.['*'] || current[segment]['*']?.[ctx.method]) {
                result = current[segment]['*'][ctx.method] ?? current[segment]['*']['*'];
                resultPointer = env.pathPointer + 1;
                resultArgNames = current[segment]['*']['::' + ctx.method] ?? current[segment]['*']['::*'];
            }

            current = current[segment];
            env.pathPointer++;

            // ends
            if (env.pathPointer >= env.path.length && (current['@']?.['*'] || current['@']?.[ctx.method])) {
                result = current['@'][ctx.method] ?? current['@']['*'];
                resultPointer = env.pathPointer;
                resultArgNames = current['@']['::' + ctx.method] ?? current['@']['::*'];
            }
        }

        env.pathPointer = resultPointer;
        if (resultArgNames) {
            const len = resultArgNames.length;
            for (let i = 0; i < len; i++) {
                ctx.params[resultArgNames[i]] = currentArgs[i];
            }
        }
        return result;
    }
}

// host router: routes the request by host
class HostRouter {
    constructor(end = 404, map = {}) {
        this.end = end;

        // parse map
        this.map = {};
        for (let [key, value] of Object.entries(map)) {
            // any path segment
            if (key === '*') {
                this.map['*'] = value;
                continue;
            }

            key = key.trimStart();

            const firstDotIndex = key.indexOf('.');
            if (firstDotIndex === -1) continue;

            // key format: '[@ (domain end check)].domain.segments'
            // example: '@ .com.example', '.com.example', '.localhost', '.1.0.0.127' (yes, that's how it works)
            const routeEnd = key.startsWith('@');
            const routeDomain = key.substring(firstDotIndex).split('.').slice(1);

            // expand map
            let current = this.map;
            let args = [];
            for (const segment of routeDomain) {
                if (segment.startsWith('%:')) {
                    args.push(segment.substring(2));
                    if (!current[':']) current[':'] = {};
                    current = current[':'];
                    continue;
                }

                if (!current['.' + segment]) current['.' + segment] = {};
                current = current['.' + segment];
            }

            // '*' for non-end check, '@' for end check
            current[routeEnd ? '@' : '*'] = value;
            if (args.length > 0) current['::'] = args;
        }
    }

    route(env, ctx) {
        if (env.hostPointer >= env.host.length) return this.end;

        let result = this.map['*'];
        let resultPointer = env.hostPointer;
        let current = this.map;
        let currentArgs = [];
        let resultArgNames;
        while (env.hostPointer < env.host.length) {
            let segment = '.' + env.host[env.hostPointer];
            if (!current[segment] && !current[':']) break;
            if (!current[segment]) {
                segment = ':';
                currentArgs.push(env.host[env.hostPointer]);
            }

            // prepare fallback
            if (current[segment]['*']) {
                result = current[segment]['*'];
                resultPointer = env.hostPointer + 1;
                resultArgNames = current[segment]['::'];
            }

            current = current[segment];
            env.hostPointer++;

            // ends
            if (env.hostPointer >= env.host.length && current['@']) {
                result = current['@'];
                resultPointer = env.hostPointer;
            }
        }

        env.hostPointer = resultPointer;
        if (resultArgNames) {
            const len = resultArgNames.length;
            for (let i = 0; i < len; i++) {
                ctx.params[resultArgNames[i]] = currentArgs[i];
            }
        }
        return result;
    }
}

// method router: routes the request by method
class MethodRouter {
    constructor(methodMap = {}) {
        this.methodMap = methodMap;
    }

    route(env, ctx) {
        return this.methodMap[ctx.method] || this.methodMap['*'] || 405;
    }
}

// function router: a simple router that allows you to make custom routing logic
class FunctionRouter {
    constructor(fn, ext) {
        this.fn = fn;
        this.ext = ext;
    }

    route(env, ctx) {
        return this.fn(env, ctx, this.ext);
    }
}

// path argument router: collects a path segment and save to `ctx.params`
class PathArgRouter {
    constructor(paramName, next) {
        this.paramName = paramName;
        this.next = next;
    }

    route(env, ctx) {
        ctx.params[this.paramName] = env.path[env.pathPointer];
        env.pathPointer++;

        return this.next;
    }
}

// host argument router: collects a host segment and save to `ctx.params`
class HostArgRouter {
    constructor(paramName, next) {
        this.paramName = paramName;
        this.next = next;
    }

    route(env, ctx) {
        ctx.params[this.paramName] = env.host[env.hostPointer];
        env.hostPointer++;

        return this.next;
    }
}

// set code router: set the code handler for specific status code
class SetCodeRouter {
    constructor(codeHandlers, next) {
        this.codeHandlers = codeHandlers;
        this.next = next;
    }

    route(env, ctx) {
        env.codeHandlers = Object.assign({}, env.codeHandlers, this.codeHandlers);
        return this.next;
    }
}

// export
module.exports = {
    PathRouter, HostRouter, MethodRouter, FunctionRouter, PathArgRouter, HostArgRouter, SetCodeRouter,
    routerConstructors: {
        Path: (end, map) => new PathRouter(end, map),
        Host: (end, map) => new HostRouter(end, map),
        Method: (methodMap) => new MethodRouter(methodMap),
        Function: (fn, ext) => new FunctionRouter(fn, ext),
        PathArg: (name, next) => new PathArgRouter(name, next),
        SetCode: (handlers, next) => new SetCodeRouter(handlers, next)
    }
};