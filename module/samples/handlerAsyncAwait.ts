import { FnEvent, FnContext, FnResult } from "../snapcore-dih"

/**
 * This sample shows how to handle a long running process using async/await
 */

const longRunningProcess = (cb) => {
  const min = 1 // 1 sec
  const max = 5 // 5 sec
  const delay = Math.round(Math.random() * (max - min) + min)
  setTimeout(() => cb(delay), delay * 1000)
}

const promisedProcess = () => new Promise((resolve, reject) => longRunningProcess((delay) => resolve(delay)))

/**
 * Function's handler, note that it's an async function
 *
 * non async handlers are deprecated, they must be handled with a callback, please see samples
 *
 * @param event function's inputs () (path, parameters, body, query, client, identification..etc)
 * @param context overall function's context (environment, logging context, runtime..etc)
 * @returns function's output
 */
export async function handler(event: FnEvent, context: FnContext): Promise<FnResult> {
  // that's were we call the long running process
  // since we run in an async function, the code is straightforward
  const delay = await promisedProcess()

  const result: FnResult = {
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
  }

  // try raising an error
  //throw new Error("a bug!")
  return result
}
