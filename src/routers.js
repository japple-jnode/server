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
            const routeMethod = key.substring(routeEnd ? 1 : 0, firstSlashIndex).trim().toUpperCase();
            const routePath = key.substring(firstSlashIndex).split('/').slice(1).map(decodeURIComponent);

            // expand map
            let current = this.map;
            for (const segment of routePath) {
                if (!current['/' + segment]) current['/' + segment] = {};
                current = current['/' + segment];
            }

            // '*' for non-end check, '@' for end check
            // '*' for any method, 'METHOD' for specific method
            if (!current[routeEnd ? '@' : '*']) current[routeEnd ? '@' : '*'] = {};
            current[routeEnd ? '@' : '*'][routeMethod || '*'] = value;
        }
    }

    route(env, ctx) {
        if (env.pathPointer >= env.path.length) return this.end;

        let result = this.map['*'];
        let resultPointer = env.pathPointer;
        let current = this.map;
        while (env.pathPointer < env.path.length) {
            const segment = '/' + env.path[env.pathPointer];
            if (!current[segment]) break;

            // prepare fallback
            if (current[segment]['*']?.['*'] || current[segment]['*']?.[ctx.method]) {
                result = current[segment]['*'][ctx.method] ?? current[segment]['*']['*'];
                resultPointer = env.pathPointer + 1;
            }

            current = current[segment];
            env.pathPointer++;

            // ends
            if (env.pathPointer >= env.path.length && (current['@']?.['*'] || current['@']?.[ctx.method])) {
                result = current['@'][ctx.method] ?? current['@']['*'];
                resultPointer = env.pathPointer;
            }
        }

        env.pathPointer = resultPointer;
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
            for (const segment of routeDomain) {
                if (!current['.' + segment]) current['.' + segment] = {};
                current = current['.' + segment];
            }

            // '*' for non-end check, '@' for end check
            current[routeEnd ? '@' : '*'] = value;
        }
    }

    route(env, ctx) {
        if (env.hostPointer >= env.host.length) return this.end;

        let result = this.map['*'];
        let resultPointer = env.hostPointer;
        let current = this.map;
        while (env.hostPointer < env.host.length) {
            const segment = '.' + env.host[env.hostPointer];
            if (!current[segment]) break;

            // prepare fallback
            if (current[segment]['*']) {
                result = current[segment]['*'];
                resultPointer = env.hostPointer + 1;
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
    constructor(fn) {
        this.fn = fn;
    }

    route(env, ctx) {
        return this.fn(env, ctx);
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
        Path: (...args) => new PathRouter(...args),
        Host: (...args) => new HostRouter(...args),
        Method: (...args) => new MethodRouter(...args),
        Function: (...args) => new FunctionRouter(...args),
        PathArg: (...args) => new PathArgRouter(...args),
        HostArg: (...args) => new HostArgRouter(...args),
        SetCode: (...args) => new SetCodeRouter(...args)
    }
};