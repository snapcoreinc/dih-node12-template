"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdown = exports.ready = exports.init = exports.handler = void 0;
async function handler(event, context, callback) {
    const result = {
        statusCode: 200,
        body: {
            status: "HelloWorld from SnapCore's DIH!  event.body: " + JSON.stringify(event.body),
        },
    };
    return result;
}
exports.handler = handler;
function init(context) { }
exports.init = init;
function ready(context) {
    console.log(`SnapCore DIH Node.js listening on http://localhost:${context.port} in ${context.environment}`);
}
exports.ready = ready;
function shutdown(context) { }
exports.shutdown = shutdown;
