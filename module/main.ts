//import { FnEvent, FnContext, FnResult, FnCallback } from "@snapcore/snapcore-types"

import { FnEvent, FnContext, FnResult, FnCallback } from "./snapcore-dih"

/**
 * Function's handler, note that it's an async function
 *
 * non async handlers are deprecated, they must be handled with a callback, please see samples
 *
 * @param event function's inputs () (path, parameters, body, query, client, identification..etc)
 * @param context overall function's context (environment, logging context, runtime..etc)
 * @param callback now deprecated in favor of async/await, still there for portability
 * @returns function's output
 */
export async function handler(event: FnEvent, context: FnContext, callback?: FnCallback): Promise<FnResult> {
  const result: FnResult = {
    statusCode: 200,
    body: {
      status: "Hello world from SnapCore's DIH: " + JSON.stringify(event.body),
    },
  }

  // an error would be raised as follows
  // throw new Error("a bug!")
  return result
}

export function init(context: FnContext) {}

export function ready(context: FnContext) {
  console.log(`SnapCore DIH Node.js listening on http://localhost:${context.port} in ${context.environment}`)
}

export function shutdown(context: FnContext) {}
