/*
@jnode/server/util.js
v2

Simple web server package for Node.js.

by JustApple
*/

// dependencies
const qs = require('querystring');

// receive body
function receiveBody(req, max = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const parts = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > max) return;
            parts.push(chunk);
        });
        req.on('end', () => {
            if (size > max) reject(413);
            else resolve(Buffer.concat(parts));
        });
        req.on('error', err => reject(err));
    });
}

function setCookie(res, key, value, options) {
    const cookieHeaders = res.getHeader('set-cookie');
    const cookie = `${key}=${encodeURIComponent(value)}` + options ? '; ' + qs.stringify(options, '; ', '=') : '';
    if (Array.isArray(cookieHeaders)) {
        cookieHeaders.push(cookie);
        res.setHeader('Set-Cookie', cookieHeaders);
    } else if (cookieHeaders === undefined) {
        res.setHeader('Set-Cookie', cookie);
    } else {
        res.setHeader('Set-Cookie', [cookieHeaders, cookie]);
    }
}

// export
module.exports = {
    receiveBody,
    setCookie
};