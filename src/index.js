/*
@jnode/server
v2

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

// router
class Router {
	constructor() {
		console.warn('Hey! There is no need to use class `Router` directly, just use any object with a `.route(env, ctx)` method as a router.');
		console.warn('Learn more at the documentation (README.md).');
	}

	route(env, ctx) { }
}

// handler
class Handler {
	constructor() {
		console.warn('Hey! There is no need to use class `Handler` directly, just use any object with a `.handle(ctx, env)` method as a handler.');
		console.warn('Learn more at the documentation (README.md).');
	}

	handle(ctx, env) { }
}

// export
module.exports = {
	mimeTypes: require('./mime.json'),
	Router, Handler,
	...require('./routers.js'),
	...require('./handlers.js'),
	...require('./server.js')
};