/*
@jnode/server/util.js
v2

Simple web server package for Node.js.

by JustApple
*/

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

// export
module.exports = {
    receiveBody
};