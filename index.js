"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const express = require("express");
const http = require("http");
const os = require("os");
const service_tools_1 = require("@banzaicloud/service-tools");
const util_1 = require("util");
const stoppable = require("stoppable");
const main_1 = require("./module/main");
console.info("initializing Fn()...");
process.stdin.resume();
function scheduleGc() {
    if (!global.gc) {
        console.log("FYI the garbage collector API is not exposed, skipping");
        return;
    }
    const gcDelay = process.env.gc_interval || "30000";
    setTimeout(function () {
        global.gc();
        scheduleGc();
    }, Number.parseInt(gcDelay));
}
scheduleGc();
const pjson = require("./package.json");
const isObject = (a) => !!a && a.constructor === Object;
class FunctionEvent {
    constructor(req) {
        this.body = req.body;
        this.headers = req.headers;
        this.httpMethod = req.method;
        this.queryStringParameters = req.query;
        this.path = req.path;
    }
}
class FunctionContext {
    constructor() {
        this.functionName = pjson.name;
        this.functionVersion = pjson.version;
        this.environment = service_tools_1.config.environment.nodeEnv;
        this.port = process.env.http_port || "3000";
        this.logGroupName = process.env.logGroupName || "default";
        this.logStreamName = process.env.logStreamName || "default";
    }
    memoryLimitInMB() {
        return Math.round((os.freemem() / 1024 / 1024) * 100) / 100;
    }
}
const fnContext = new FunctionContext();
main_1.init === null || main_1.init === void 0 ? void 0 : main_1.init(fnContext);
const app = express();
app.use(bodyParser.json({ limit: "20kb" }));
app.use(bodyParser.raw({ limit: "20kb" }));
app.use(bodyParser.text({ limit: "20kb", type: "text/*" }));
app.disable("x-powered-by");
const fnHandler = (req, res) => {
    const fnEvent = new FunctionEvent(req);
    const handleResult = (result) => {
        if (result) {
            const statusCode = result.statusCode || 200;
            res.status(statusCode);
            if (result.headers) {
                res.set(result.headers);
            }
            const value = result.body || result;
            if (value) {
                const body = Array.isArray(value) || isObject(value) ? JSON.stringify(value) : value;
                res.send(body);
            }
            res.end();
        }
    };
    const fnCallback = (error, result) => {
        if (error) {
            if (typeof error === "string") {
                result = {
                    statusCode: 500,
                    body: {
                        errorMessage: error,
                    },
                };
            }
            else {
                result = {
                    statusCode: 500,
                    body: {
                        errorName: error.name,
                        errorMessage: error.message,
                        trace: error.stack.split("\n"),
                    },
                };
            }
        }
        if (result)
            handleResult(result);
    };
    let result;
    try {
        if (main_1.handler)
            result = main_1.handler(fnEvent, fnContext, fnCallback);
        else
            console.error("NOT FOUND - export async function handler(event: FnEvent, context: FnContext, callback?: FnCallback): Promise<FnResult> ");
    }
    catch (err) {
        fnCallback(err);
    }
    if (result && result instanceof Promise) {
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
            });
        });
    }
    else {
    }
};
async function allIsGood() {
    return true;
}
app.get("/metrics", service_tools_1.middleware.express.prometheusMetrics());
app.get("/_/health", service_tools_1.middleware.express.healthCheck([allIsGood]));
app.post("/*", fnHandler);
app.get("/*", fnHandler);
app.patch("/*", fnHandler);
app.put("/*", fnHandler);
app.delete("/*", fnHandler);
app.use(service_tools_1.middleware.express.errorHandler());
const server = stoppable(http.createServer(app));
server.once("listening", () => {
    main_1.ready === null || main_1.ready === void 0 ? void 0 : main_1.ready(fnContext);
});
server.once("error", (err) => {
    console.error("f() server initialization error: " + err.stack);
    process.exit(1);
});
const closeServer = util_1.promisify(() => server.stop()).bind(server);
async function closeResources() {
    if (closeServer)
        await closeServer();
    main_1.shutdown === null || main_1.shutdown === void 0 ? void 0 : main_1.shutdown(fnContext);
}
service_tools_1.gracefulShutdown([closeResources]);
server.listen(fnContext.port);
console.info("Done initializing Fn()");
