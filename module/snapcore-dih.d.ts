export interface FnEvent {
    body: string | null
    headers: { [header: string]: string }
    //   multiValueHeaders: { [name: string]: string[] }
    httpMethod: string
    //   isBase64Encoded: boolean
    path: string
    // parameter coming from the command line
    pathParameters: { [name: string]: string } | null
    // parameters coming from url
    queryStringParameters: { [name: string]: string } | null

    requestContext: {
        requestId: string
        isBase64Encoded?: boolean
        identity?: string
        roles?: string
    }
}

export interface FnContext {
    // function's meta data
    functionName: string
    functionVersion: string

    // logging meta data
    logGroupName: string
    logStreamName: string

    // internal url where the function is deployed, typically http://localhost:port
    internalUrl: string

    // external url where the function is deployed
    externalUrl: string

    // default to env.http_port or 3000
    port: string

    // production or development, maps to NODE_ENV
    environment: string

    // method returns the amount of free system memory in MB as a float
    memoryLimitInMB(): number
}

export interface FnResult {
    statusCode: number
    headers?: {
        [header: string]: boolean | number | string
    }
    multiValueHeaders?: {
        [header: string]: Array<boolean | number | string>
    }
    body: string | Array<Object> | Object
    isBase64Encoded?: boolean
}

/**
 * Optional callback parameter.
 *
 * @param error – an optional parameter that you can use to provide results of the failed Lambda function execution.
 *                It can be a string for Lambda Proxy Integrations
 * @param result – an optional parameter that you can use to provide the result of a successful function execution. The result provided must be JSON.stringify compatible.
 */
export type FnCallback = (error?: Error | null | string, result?: FnResult) => void

// Used by init, ready, shutdown
export type FnLifeCycle = (ctx: FnContext) => void

/**
 * Fn handler function.
 *
 * @param event – event data.
 * @param context – runtime information of the Lambda function that is executing.
 * @param callback – optional callback to return information to the caller, otherwise return value is null.
 * @return A promise for the result or void, if handled via callbacks
 */
export type FnHandler = (event: FnEvent, context: FnContext, callback?: FnCallback) => void | Promise<FnResult>

export interface FnHandlerFile {
    handler: FnHandler
    init?: FnLifeCycle
    ready?: FnLifeCycle
    shutdown?: FnLifeCycle
}
