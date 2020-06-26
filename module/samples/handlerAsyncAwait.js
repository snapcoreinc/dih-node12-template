"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const longRunningProcess = (cb) => {
    const min = 1;
    const max = 5;
    const delay = Math.round(Math.random() * (max - min) + min);
    setTimeout(() => cb(delay), delay * 1000);
};
const promisedProcess = () => new Promise((resolve, reject) => longRunningProcess((delay) => resolve(delay)));
async function handler(event, context) {
    const delay = await promisedProcess();
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
    return result;
}
exports.handler = handler;
