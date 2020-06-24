import * as bodyParser from "body-parser"
import * as express from "express"
import * as http from "http"
import * as os from "os"
import { catchErrors, config, gracefulShutdown, middleware } from "@banzaicloud/service-tools"
import { promisify } from "util"
import { Request, Response } from "express"
import { StoppableServer } from "stoppable"
import stoppable = require("stoppable")

import { handler, init, shutdown, ready } from "./module/main"
import { FnContext, FnEvent, FnHandlerFile, FnResult } from "./typings/snapcore-dih"

//catchErrors([closeResources])

console.info("initializing Fn()...")

// Causes the process to pause and override disable default behavior like exiting on Ctrl+C.
process.stdin.resume()

// This function sets up a recurring gc() call every process.env.gc_interval ms
// It is only active if node is given parameters --nouse-idle-notification --expose-gc
// for transactional processing, triggering gc() on regular interval is much more efficient
function scheduleGc() {
  if (!global.gc) {
    console.log("FYI the garbage collector API is not exposed, skipping")
    return
  }

  const gcDelay = process.env.gc_interval || "30000"

  setTimeout(function () {
    global.gc()
    //console.log('Manual gc', process.memoryUsage())
    scheduleGc()
  }, Number.parseInt(gcDelay))
}

// call this in the startup script of your app (once per process)
scheduleGc()

// used to read function meta-data and provide it in the context
const pjson = require("./package.json")

// handy function to check typeof object
const isObject = (a) => !!a && a.constructor === Object

class FunctionEvent implements FnEvent {
  body: string | null
  headers: { [header: string]: string }
  httpMethod: string
  queryStringParameters: any
  path: any
  pathParameters: { [name: string]: string } | null
  requestContext: { requestId: string }

  constructor(req: Request) {
    this.body = req.body
    //@ts-ignore types are not exactly the same but it should be fine
    this.headers = req.headers
    this.httpMethod = req.method
    this.queryStringParameters = req.query
    this.path = req.path
  }
}

class FunctionContext implements FnContext {
  internalUrl: string
  externalUrl: string

  port: string
  environment: string
  functionName: string
  functionVersion: string
  logGroupName: string
  logStreamName: string

  constructor() {
    this.functionName = pjson.name
    this.functionVersion = pjson.version
    this.environment = config.environment.nodeEnv
    this.port = process.env.http_port || "3000"
    this.logGroupName = process.env.logGroupName || "default"
    this.logStreamName = process.env.logStreamName || "default"
  }

  // method returns the amount of free system memory in MB as a float
  public memoryLimitInMB(): number {
    return Math.round((os.freemem() / 1024 / 1024) * 100) / 100
  }
}

// globally set for now - let's see if this pattern fits
// as a consequence, all invocation context attributes should be in the event.
// that's a radical change from Lambda btw
const fnContext = new FunctionContext()

init?.(fnContext)

const app = express()

//TODO: get the limit from the context
app.use(bodyParser.json({ limit: "20kb" }))
app.use(bodyParser.raw({ limit: "20kb" }))
app.use(bodyParser.text({ limit: "20kb", type: "text/*" }))
app.disable("x-powered-by")

// initialize the function

const fnHandler = (req: Request, res: Response) => {
  // build the event from every request, context is static
  const fnEvent = new FunctionEvent(req)

  // this function is responsible for sending the result back to the caller
  const handleResult = (result: FnResult) => {
    if (result) {
      const statusCode = result.statusCode || 200
      res.status(statusCode)

      if (result.headers) {
        res.set(result.headers)
      }

      const value = result.body || result
      if (value) {
        const body = Array.isArray(value) || isObject(value) ? JSON.stringify(value) : value
        res.send(body)
      }
      res.end()
    }
  }

  const fnCallback = (error?: Error | null | string, result?: FnResult) => {
    if (error) {
      if (typeof error === "string") {
        result = {
          statusCode: 500,
          body: {
            errorMessage: error,
          },
        }
      } else {
        result = {
          statusCode: 500,
          body: {
            errorName: error.name,
            errorMessage: error.message,
            //@ts-ignore
            trace: error.stack.split("\n"),
          },
        }
      }
    }
    if (result) handleResult(result)
  }

  let result
  try {
    // CALL THE HANDLER!
    // @ts-ignore  compilation will fail here, because imported handler is async and only has two parameters
    // - yet we do support callbacks and need to pass 3.
    // The other option would be to define the 3rd parameter in the handler. callbacks are deprecated!
    if (handler) result = handler(fnEvent, fnContext, fnCallback)
    else
      console.error(
        "NOT FOUND - export async function handler(event: FnEvent, context: FnContext, callback?: FnCallback): Promise<FnResult> "
      )
  } catch (err) {
    fnCallback(err)
  }
  if (result && result instanceof Promise) {
    // We get to this point if the handler is async

    result
      .then((asyncResult) => handleResult(asyncResult))
      .catch((err) => {
        handleResult({
          statusCode: 500,
          body: {
            errorName: err.name,
            errorMessage: err.message,
            trace: err.stack.split("\n"),
          },
        })
      })
  } else {
    // the handler uses callbacks, nothing to do, as handlerResult will be called via the callback
  }
}

app.post("/*", fnHandler)
app.get("/*", fnHandler)
app.patch("/*", fnHandler)
app.put("/*", fnHandler)
app.delete("/*", fnHandler)

// register error middleware (must be the last!)
app.use(middleware.express.errorHandler())

// add a stop() function to express
const server: StoppableServer = stoppable(http.createServer(app))
server.once("listening", () => {
  ready?.(fnContext)
})
server.once("error", (err) => {
  console.error("f() server initialization error: " + err.stack)
  process.exit(1)
})

// cleanup resources on error and stop signal
const closeServer = promisify(() => server.stop()).bind(server)
async function closeResources() {
  // handle ongoing requests and close server
  if (closeServer) await closeServer()
  shutdown?.(fnContext)
}

// gracefully handle application stop (on SIGTERM & SIGINT)
gracefulShutdown([closeResources])

// let's start the show!
server.listen(fnContext.port)

console.info("Done initializing Fn()")
