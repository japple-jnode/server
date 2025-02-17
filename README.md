# JustServer
Simple web server package for Node.js.

## Installation

```shell
npm install @jnode/server
```

## Usage

### Import JustServer

```javascript
const { Server } = require('@jnode/server');
```

### Start a simple server

```javascript
const server = new Server({
  '*': {
    '/awa': {
      '/uwu': {
        'TEXT': 'uwu'
      },
      'TEXT': 'awa'
    }
  },
  '#': {
    '!404': {
      '+STATUS': 404,
      'TEXT': '404 Page not found!'
    },
    '!500': {
      '+STATUS': 500,
      'TEXT': '500 Internal server error!'
    }
  }
});
server.listen(8080);
server.on('error', console.error);
server.on('request', (req, res) => {
  res.on('finish', () => {
    console.log(`${res.statusCode} ${req.headers.host}${req.url}`);
  });
});
```