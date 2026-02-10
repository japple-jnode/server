# `@jnode/server`

Simple web server package for Node.js.

## Installation

```
npm i @jnode/server
```

## Quick start

### Import

```js
const { createServer, routerConstructors: r, handlerConstructors: h } = require('@jnode/server');
```

### Start a simple `Hello, world.` server

```js
const server = createServer(
  // use text handler to respond with text
  h.Text('Hello, world.')
);

// listen to port 8080
server.listen(8080);
```

### Start a complex file and API server

```js
let requestCount = 0;

const server = createServer(
  // use path router to route the request
  r.Path(
    null, // nothing should be here because a basic path is `/`
    {
      // a request counter api
      // `@` makes sure the path ends here
      '@GET /api/request-count': h.JSON({ count: requestCount }),
      // a static file service
      // using `r.Function(route)` to count requests before continuing
      'GET /files': r.Function(() => {
        requestCount++;

        // return a folder handler; it will send files for remaining path segments
        return h.Folder('./static-files/');
      })
    }
  )
);

// listen to port 8080
server.listen(8080);
```

## How it works?

Our world-leading **router-handler** framework brings you a simple, fast, and extensible development experience.

Here's what `@jnode/server` (shortened as **JNS**) will do:

1. Receive a request.
2. Use **router**s to route for a **handler**.
3. Use a **handler** to complete the request.

Pretty simple, isn't it?

Further, a **router** has a method `.route(env, ctx)` which returns either another **router** (to continue routing) or a **handler** (which has a method `.handle(ctx, env)` that will be executed to complete the request).

Also, we provide some powerful built-in routers and handlers so you can start building your own web server now! (Learn more in the [reference](#reference)). And you can find more routers or handlers on [npm](https://npmjs.com) with the query `@jnode/server-<name>` (built by the JNode team) or `jns-<name>` (built by the community).

------

# Reference

## `server.createServer(router[, options])`

- `router` [router](#class-serverrouter) | [handler-extended](#handler-extended) Same as the full filled return value of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `maxRoutingSteps` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The max steps for routing; when exceeded but still getting another router, it'll throw the client a **508** error. **Default:** `50`.
  - `enableHTTP2` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Enable HTTP/2 support (with `node:http2` [Compatibility API](https://nodejs.org/docs/latest/api/http2.html#compatibility-api)). **Default:** `false`.
  - `codeHandlers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Global status code handlers. Keys are HTTP status codes, values are [handlers-extended](#handler-extended).
  - Options in [`http.createServer()`](https://nodejs.org/docs/latest/api/http.html#httpcreateserveroptions-requestlistener), [`https.createServer()`](https://nodejs.org/docs/latest/api/https.html#httpscreateserveroptions-requestlistener), [`http2.createServer()`](https://nodejs.org/docs/latest/api/http2.html#http2createserveroptions-onrequesthandler), or [`http2.createSecureServer()`](https://nodejs.org/docs/latest/api/http2.html#http2createsecureserveroptions-onrequesthandler).
- Returns: [\<server.Server\>](#class-serverserver)

We will check if `options.key` and `options.cert` exist to decide whether to enable TLS or not. Note that most browsers reject insecure HTTP/2.

## Class: `server.Server`

- Extends: [\<EventEmitter\>](https://nodejs.org/docs/latest/api/events.html#class-eventemitter)

### `new server.Server(router[, options])`

- `router` [router](#class-serverrouter) | [handler-extended](#handler-extended) Same as the return value of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Same as [`server.createServer()`](#servercreateserverroute-options).

More details in [`server.createServer()`](#servercreateserverroute-options).

### Static method: `Server.route(router[, env, ctx, options])`

- `router` [router](#class-serverrouter) | [handler-extended](#handler-extended) Same as the return value of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `env` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Same as `env` of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `ctx` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Same as `ctx` of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `maxRoutingSteps` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The max steps for routing; when exceeded but still getting another router, it'll return number `508`. **Default:** `50`.
- Returns: [\<Promise\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) Fulfills with a [router](#class-serverrouter) or [handler-extended](#handler-extended). Simply, anything which is not a **router**. Will return `404` if router returns `undefined` or `null`.

Please note that this function will modify `env.i` to count routing steps for safety.

### `server.listen()`

Starts the server listening for connections. This method is identical to [`server.listen()`](https://nodejs.org/docs/latest/api/net.html#serverlisten) from [`net.Server`](https://nodejs.org/docs/latest/api/net.html#class-netserver).

### `server.close(...args)`

Closes the server. This method is identical to [`server.close()`](https://nodejs.org/docs/latest/api/net.html#serverclose) from [`net.Server`](https://nodejs.org/docs/latest/api/net.html#class-netserver).

### `server.throw(...args)`

Emits an error event `'e'` with the provided arguments. Useful for custom error handling and logging.

### Event: `'e'`

Emitted when an error occurs during routing or handling. The event includes the error object, `env`, and `ctx`.

### Event: `'warn'`

Emitted when a non-critical warning occurs, such as an invalid request URL.

## Class: `server.Router`

This class is a base interface that defines the structure of a **router**; it does not contain built-in logic. Any object with method [`.route(env, ctx)`](#routerrouteenv-ctx) will be viewed as a **router**.

### `router.route(env, ctx)`

- `env` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `path` [\<string[]\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The request path split by `'/'` and excluding the first segment (which is always an empty string since the path always starts with `'/'`). E.G. `'/a/b'` will become `[ 'a', 'b' ]`, and `/a/` will become `[ 'a', '' ]`.
  - `pathPointer` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The path index pointer. Use it in your own router if needed to ensure capability with `PathRouter`.
  - `host` [\<string[]\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The request host split by `.` and reversed. E.G. `'example.com'` will become `[ 'com', 'example' ]`.
  - `hostPointer` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The host index pointer. Use it in your own router if needed so they could be compatible with the core `HostRouter`.
  - `codeHandlers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Keys are HTTP status codes, and values are [handlers-extended](#handler-extended).
  - `i` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) How many routers the request has gone through; do not change it in your own routers because the main loop increments it.
- `ctx` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `req` [\<http.IncomingMessage\>](https://nodejs.org/docs/latest/api/http.html#class-httpincomingmessage) | [\<http2.Http2ServerRequest\>](https://nodejs.org/docs/latest/api/http2.html#class-http2http2serverrequest) The request object.
  - `res` [\<http.ServerResponse\>](https://nodejs.org/docs/latest/api/http.html#class-httpserverresponse) | [\<http2.Http2ServerResponse\>](https://nodejs.org/docs/latest/api/http2.html#class-http2http2serverresponse) The response object.
  - `url` [\<URL\>](https://nodejs.org/docs/latest/api/url.html#class-url) The parsed request URL.
  - `server` [\<server.Server\>](#class-serverserver) The server instance.
  - `path` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The request path (pathname part of the URL).
  - `host` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The request hostname.
  - `method` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The HTTP request method (e.g., `'GET'`, `'POST'`).
  - `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) The request headers.
  - `identity` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Identity information for the requesting client.
    - `address` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The remote address from `req.socket.remoteAddress`, may be modified by routers to resolve the original client IP behind a proxy.
    - `port` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The remote port from `req.socket.remotePort`, may be modified by routers to resolve the original client port behind a proxy.
  - `params` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) The parameters including query string parameters; could also be injected by routers.
  - `body` [\<stream.Readable\>](https://nodejs.org/docs/latest/api/stream.html#class-streamreadable) The request body stream (same as `req`).

- Returns: [\<Promise\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) | [\<router\>](#class-serverrouter) | [handler-extended](#handler-extended) Fulfills with a [router](#class-serverrouter) or [handler-extended](#handler-extended). Promise is not strictly required; synchronous functions are also acceptable.

The `env` object contains metadata mainly for the routing process, while the `ctx` object is mainly for the handling process and used to store custom properties in most cases.

Here is an example custom router:

```js
const { h: handlerConstructors } = require('@jnode/server');

// meow router, always responds with the text 'Meow!' if the request path contains any 'meow'
// (ignore why we need this)
class MeowRouter {
  constructor(next) {
    this.next = next;
  }

  // this makes the class a router
  route(env, ctx) {
    if (env.path.includes('meow')) {
      return h.Text('Meow!');
    }
    return this.next;
  }
}
```

As for exporting, you could make a factory function like what we done in official routers:

```js
// exporting
module.exports = {
  MeowRouter, // original class
  routerConstructors: {
    Meow: (...args) => new MeowRouter(...args)
  }
};
```

If you even want to publish your routers or handlers on [npm](https://npmjs.com) (why not?), feel free to name your package as `jns-<name>` so other developers will know it's for `@jnode/server`! E.G. `jns-meow`.

## Class: `server.Handler`

This class is a base interface that defines the structure of a **handler**; it does not contain built-in logic. Any object with method [`.handle(ctx, env)`](#handlerhandlectx-env) will be viewed as a **handler**.

### `handler.handle(ctx, env)`

- `ctx` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Same as `ctx` of [`router.route(env, ctx)`](#routerrouteenv-ctx).
- `env` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Same as `env` of [`router.route(env, ctx)`](#routerrouteenv-ctx).

Handlers can throw a numeric error code to call `codeHandlers`, e.g., `throw 404`.

Here is an example custom handler:

```js
// random int handler, returns a random integer
class RandomIntHandler {
  constructor(from, to, options) {
    this.from = from;
    this.to = to;
    this.options = options;
  }

  // this makes the class a handler
  handle(ctx, env) {
    const num = String(Math.floor(Math.random() * (this.to - this.from + 1)) + this.from);

    const headers = this.options.headers ?? {};
    headers['Content-Type'] = headers['Content-Type'] ?? 'text/plain';
    headers['Content-Length'] = Buffer.byteLength(num, 'utf8');

    ctx.res.writeHead(this.options.statusCode ?? 200, headers);
    ctx.res.end(num);
  }
}
```

### `handler-extended`

`handler-extended` includes a standard [handler](#class-serverhandler) and the following types:

- Number status code, we will find the actual handler from `env.codeHandlers`.
- String, [`Buffer`](https://nodejs.org/docs/latest/api/buffer.html#class-buffer), [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array), or [`stream.Readable`](https://nodejs.org/docs/latest/api/stream.html#class-streamreadable) as body, only for simple situations because you could not modify status code or headers.
- Function does the same thing as [`handler.handle(ctx, env)`](#handlerhandlectx-env).

## `server.mimeTypes`

- Type: [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

A mapping of file extensions (`.<ext>`) to their corresponding MIME types.

## Built-in routers

We provide two methods to use them:

1. `new` based, use it via `new server.<Name>Router(...)`.
2. Factory functions, use it via `server.routerConstructors.<Name>(...)`.

### Router: `PathRouter(end, map)`

- `end` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when the path resolver came to the end (`env.pathPointer >= env.path.length`).
- `map` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `/<path_segment>[/<path_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) A simple path segment routing. E.G., `'/meow': 'Meow!'` (ignoring later segments, `'/meow/something'` will also have the same result as `'/meow'`), `'/cats': r.Path(null, { '/meow': 'Meow!! Meow!!' })` or `'/cats/meow': 'Meow!! Meow!!'`.
  - `@/<path_segment>[/<path_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when the path resolver ends here; equals to `'/<path_segment>': r.Path(<value>)`. E.G., `'@/meow': 'Meow!'` (only works for path `'/meow'` but not `'/meow/something'`).
  - `<METHOD>/<path_segment>[/<path_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when the method matches; equals to `'/<path_segment>': r.Method({ '<METHOD>': <value> })`. E.G., `'GET/meow': 'Meow!'` (only works for HTTP method `'GET'`).
  - `@<METHOD>/<path_segment>[/<path_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when both the path resolver ends and the method matches; equals to `'/<path_segment>': r.Path(r.Method({ '<METHOD>': <value> }))`. E.G., `'@GET/meow': 'Meow!'` (only works for path `'/meow'` but not `'/meow/something'` and request method is `'GET'`).
  - `*` [router](#class-serverrouter) | [handler-extended](#handler-extended) Any path segment. E.G. `'*': h.Text('Meow? Nothing here!', { statusCode: 404 })`.
  - `/%:<path_parameter_name>` [router](#class-serverrouter) | [handler-extended](#handler-extended) Match any segment (if exists) and save the segment to `ctx.params` by `<path_parameter_name>`. Do the similar thing as [`PathArgRouter`](#router-pathargrouterparamname-next).

`PathRouter` is probably the most important router; almost every server needs it!

Please note that when defining only `/%:arg/b` and `/a/c`, requesting `/a/b` **WILL NOT** return the value of `/%:arg/b`. Instead, it will return `404`. This limitation is in place to improve performance, and we believe in designing a great API. If you still need this functionality, you can build your own router.

By the way, if you’re looking for a universal matching character, use `'/%:'` instead of `'/*'` (this will match to `'*'` in a literal sense).

#### How it works?

This section delves into the intricacies of how `PathRouter` functions. If you’re not interested in this topic, feel free to skip it.

Everything begins with the constructor. When we receive your `map`, we parse it into an internal structure. Here's an example:

```js
// the map you passed in
map = {
  '/a': 'A!',
  '/a/b': 'B!',
  '@/a/b': 'C!',
  'GET/a': 'D!',
  '@GET/a/b': 'E!',
  '@GET/%:arg/c': 'F!',
  '*': 'G!'
};

// we will parse into
parsed = {
  '/a': {
    '*': { // note that the * here doesn't count for path resolver
      // object of methods
      '*': 'A!',
      'GET': 'D!'
    },
    '/b': {
      '*': {
        // object of methods
        '*': 'B!'
      },
      '@': {
        '*': 'C!',
        'GET': 'E!'
      }
    }
  },
  ':': {
    '/c': {
      '@': {
        'GET': 'F!',
        '::GET': [ 'arg' ]
      }
    }
  },
  '*': 'G!'
};
```

This format allows for fast and flexible path routing while maintaining simplicity for developers. However, as mentioned earlier, some specialized path matching will not be supported.

### Router: `HostRouter(end, map)`

- `end` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when the host resolver came to the end (`env.hostPointer >= env.host.length`).
- `map` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `.<host_segment>[.<host_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) A simple host segment routing (reversed). E.G., `.example.com` will match `example.com`, `.localhost` will match `localhost`.
  - `@.<host_segment>[.<host_segment>...]` [router](#class-serverrouter) | [handler-extended](#handler-extended) Used when the host resolver ends here. E.G., `@.example.com` (only works for exactly `example.com` but not `sub.example.com`).
  - `*` [router](#class-serverrouter) | [handler-extended](#handler-extended) Any host segment.
  - `.%:<host_parameter_name>` [router](#class-serverrouter) | [handler-extended](#handler-extended) Match any segment (if exists) and save the segment to `ctx.params` by `<host_parameter_name>`.

### Router: `MethodRouter(methodMap)`

- `methodMap` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `<METHOD>` [router](#class-serverrouter) | [handler-extended](#handler-extended) A simple method routing. E.G., `'GET': h.Text('Hello!')`, `'POST': h.JSON({ ok: true })`.
  - `*` [router](#class-serverrouter) | [handler-extended](#handler-extended) Any method, used as fallback.
- Returns: [\<MethodRouter\>](#router-methodroutermethodmap) Routes based on HTTP method, returns 405 if no method matches.

### Router: `FunctionRouter(fn, ext)`

- `fn` [\<Function\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) A function with signature `(env, ctx, ext) => router | handler-extended`.
- `ext` [\<any\>] Passed to `func`.

A simple router that allows you to implement custom routing logic.

### Router: `PathArgRouter(paramName, next)`

- `paramName` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The parameter name to save the current path segment.
- `next` [router](#class-serverrouter) | [handler-extended](#handler-extended) The next router or handler to call after collecting the parameter.

Collects a path segment and saves it to `ctx.params[paramName]`, then advances the path pointer and continues routing.

### Router: `HostArgRouter(paramName, next)`

- `paramName` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The parameter name to save the current host segment.
- `next` [router](#class-serverrouter) | [handler-extended](#handler-extended) The next router or handler to call after collecting the parameter.

Collects a host segment and saves it to `ctx.params[paramName]`, then advances the host pointer and continues routing.

### Router: `SetCodeRouter(codeHandlers, next)`

- `codeHandlers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `<STATUS_CODE>` [handler-extended](#handler-extended) A handler to respond when the specified HTTP status code is thrown. E.G., `404: h.Text('Not found!', { statusCode: 404 })`, `500: h.JSON({ error: 'Internal server error' }, { statusCode: 500 })`.
- `next` [router](#class-serverrouter) | [handler-extended](#handler-extended) The next router or handler to call after setting up the code handlers.

Sets custom handlers for specific HTTP status codes, which will be used when handlers throw numeric error codes. The code handlers set by this router are merged with existing ones in `env.codeHandlers`.

## Built-in handlers

We provide two methods to use them:

1. `new` based, use it via `new server.<Name>Handler(...)`.
2. Factory functions, use it via `server.handlerConstructors.<Name>(...)`.

### Handler: `DataHandler(data[, options])` (alias: `TextHandler`)

- `data` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) | [\<Buffer\>](https://nodejs.org/docs/latest/api/buffer.html#class-buffer) | [\<Uint8Array\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) | [\<stream.Readable\>](https://nodejs.org/docs/latest/api/stream.html#class-streamreadable) The data to send.
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `statusCode` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) HTTP status code. **Default:** `200`.
  - `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Additional headers to send.

Sends string, buffer, or stream data as response body. Automatically sets appropriate `Content-Type` and `Content-Length` headers.

### Handler: `FileHandler(file[, options])`

- `file` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) Path to the file to serve.
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `statusCode` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) HTTP status code. **Default:** `200`.
  - `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Additional headers to send.
  - `cache` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) | [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) Enable caching with `ETag` and `Last-Modified` headers. If `true`, uses only conditional caching. If number, also sets `Cache-Control: max-age=<value>`. **Default:** `false`.
  - `disableRange` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Disable HTTP Range requests. Also automatically disabled when `statusCode` is not 200. **Default:** `false`.
  - `disableHead` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Disable HEAD request support. **Default:** `false`.
  - `highWaterMark` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) Stream high water mark in bytes. **Default:** `65536`.

Serves a single file with support for HTTP Range requests, caching headers, and ETag validation. Throws `404` if file not found or is not a regular file; throws `416` if range is invalid. Supports `304 Not Modified` responses for conditional requests.

### Handler: `FolderHandler(folder[, options])`

- `folder` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) Path to the folder to serve files from.
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `allowHiddenFile` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Allows access to hidden directories and files (whose names begin with `.`).
  - Same as [`FileHandler` options](#handler-filehandlerfile-options).

Serves files from a folder based on remaining path segments. Automatically resolves paths and prevents directory traversal attacks. Internally uses `FileHandler`.

### Handler: `JSONHandler(obj[, options])`

- `obj` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) The object to serialize and send as JSON.
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `statusCode` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) HTTP status code. **Default:** `200`.
  - `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Additional headers to send.

Sends a JavaScript object serialized as JSON with `Content-Type: application/json; charset=utf-8`.

### Handler: `RedirectHandler(location[, options])`

- `location` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The redirect target URL.
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `statusCode` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) HTTP status code. **Default:** `307`.
  - `base` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) Base URL for relative redirects. If set, the redirect location will be constructed as `base + remaining path`.
  - `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Additional headers to send.

Redirects the request to a specified location. Supports both absolute URLs and dynamic redirects based on remaining path segments.

### Handler: `FunctionHandler(func, ext)`

- `func` [\<Function\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) A function with signature `(ctx, env, ext) => void | Promise<void>`.
- `ext` [\<any\>] Passed to `func`.

Allows you to implement custom request handling logic directly within a function.
