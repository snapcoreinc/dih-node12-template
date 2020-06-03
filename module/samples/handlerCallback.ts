import { FnEvent, FnContext, FnResult, FnCallback } from '@snapcore/snapcore-types'

/**
 * This sample shows how to handle a long running process using callbacks
 */

const longRunningProcess = cb => {
    const min = 1 // 1 sec
    const max = 5 // 5 sec
    const delay = Math.round(Math.random() * (max - min) + min)
    setTimeout(() => cb(delay), delay * 1000)
}

/**
 * Function's handler using call backs
 *
 *  Async/Await is now the preferred implementation
 *
 * @param event function's inputs () (path, parameters, body, query, client, identification..etc)
 * @param context overall function's context (environment, logging context, runtime..etc)
 * @returns function's output
 */
export function handler(event: FnEvent, context: FnContext, callback: FnCallback) {
    try {
        longRunningProcess(delay => {
            const result: FnResult = {
                statusCode: 200,
                headers: {
                    testStringHeader: 'string',
                    testBooleanHeader: true,
                    testIntHeader: 123
                },
                body: {
                    status: 'You said: ' + JSON.stringify(event.body),
                    delay
                }
            }
            callback(null, result)
        })
    } catch (err) {
        callback(err)
    }
}
