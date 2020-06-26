"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const longRunningProcess = (cb) => {
    const min = 1;
    const max = 5;
    const delay = Math.round(Math.random() * (max - min) + min);
    setTimeout(() => cb(delay), delay * 1000);
};
function handler(event, context, callback) {
    try {
        longRunningProcess((delay) => {
            const result = {
                statusCode: 200,
                headers: {
                    testStringHeader: "string",
                    testBooleanHeader: true,
                    testIntHeader: 123,
                },
                body: {
                    status: "You said: " + JSON.stringify(event.body),
                    delay,
                },
            };
            callback(null, result);
        });
    }
    catch (err) {
        callback(err);
    }
}
exports.handler = handler;
