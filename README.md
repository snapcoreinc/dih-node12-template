# OpenFaaS Node12 Express V2

- AWS like handler management
- Super tiny docker image by using multistage build, down to 65MB from 118MB!
- Garbage collector manually triggered every 30s to optimize processing
- Handles function life-cycle (init, ready, stop) and graceful shutdown
- Catch all uncaught exceptions and unhandled promise rejections
- Async/Away ready
- Typescript ready, _openfaas.d.ts_ provided
- Run in service mode - 1 process per pod, multiple http req

## Why Serveless & Openfaas?

- Short lived
- No ports, can be invoke multiple ways
- No state
- Single purpose
- Easy to manage
- Scale-to-zero
- Horizontal scale-out
- Centralized metrics & logs
- Automated health-checks
- Sane Kubernates defaults like running as a non-root user
- Sync & async call patterns

## Trying the template

```shell
$ faas template pull git@github.com:orefalo/node12-apollo-template.git
$ faas new --list
$ faas new --lang node12-express myfn
$ faas up -f myfn.yml
```

The template comes with several use cases for Async, Promises and callbacks. Callbacks are considered legacy and shall be removed in a near future.

# API

## What is a function?

Functions (aka. _Serverless_ or _Faas_) are the next evolution of SOA. Unlike previous iterations it shines by its simplicity and ease of management.

In a nutshell, a function is **code** that can be invoked via an **event** in a given **context**.

```mathematica
result = f( event, context )
```

| name        | description                                                                                                                                                                                                                                                                                  | ie.                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **context** | Provides information about the function and execution environment                                                                                                                                                                                                                            | version, name, dev/prod deployment, available memory                             |
| **event**   | Provides input information to the function in terms of invocation. Each client that integrates with Functions sends data as a JSON event. The structure of the event document is different for each event type, and contains data about the resource or request that triggered the function. | Url, header, query string, command line parameters, client type, identity, roles |
| **result**  | Provides output information from the function. Functions can be composed - a key differentiator, therefore the result can become the event of another function.                                                                                                                              | Depends on the function implementation.                                          |

Unlike the original openfaas' templates, there is a clear segragation of concerns between context, event and result. Please refer to **openfaas.d.ts** for a detail description of the data structures

For instance, the following example is an http event:

```json
{
  "httpMethod": "GET",
  "path": "/functions/helloworld",
  "queryStringParameters": {
    "query": "Olivier"
  },
  "headers": {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "accept-encoding": "gzip",
    "accept-language": "en-US,en;q=0.9",
    "connection": "keep-alive",
    "host": "myhost.snoopy.com",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
  },
  "body": ""
}
```

Which may return the following result:

```json
{
  "statusCode": 200,
  "path": "/functions/example",
  "headers": {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "accept-encoding": "gzip",
    "accept-language": "en-US,en;q=0.9",
    "connection": "keep-alive",
    "host": "myhost.snoopy.com"
  },
  "body": "Hello: Olivier"
}
```

## Writing the function code

The function processing is implemented by an **async** function named **handler**

```javascript
exports.handler = async function (event, context) {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2))
  return context.logStreamName
}
```

Each Client that integrates with a Function sends data as a JSON event. The structure of the event document is different for each event type, and contains data about the resource or request that triggered the function. The OpenFaas runtime convert the event into an object and pass it to your function for processing.

### Legacy Sync Callbacks

Legacy, non async handlers are also supported, but they require the use of a callback to notify results.

```javascript
exports.handler = function (event, context, callback) {
  try {
    callback(null, event.operandA + event.operandB)
  } catch (err) {
    callback(err)
  }
}
```

Teh following highlights how promises can be used with a callback

```javascript
const https = require("https")
let url = "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html"

exports.handler = function (event, context, callback) {
  https
    .get(url, (res) => {
      callback(null, res.statusCode)
    })
    .on("error", (e) => {
      callback(Error(e))
    })
}
```

## Logging

Using console logging is becoming

```javascript
exports.handler = async function (event, context) {
  console.log("ENVIRONMENT VARIABLES\n" + JSON.stringify(process.env, null, 2))
  console.info("EVENT\n" + JSON.stringify(event, null, 2))
  console.warn("Event not processed.")
  return context.logStreamName
}
```

Read function logs using the command line

```shell
faas logs <function_name>
```

## Telemetry

Functions telemetry are automatically collected and aggregated by the OpenFaas platform. Use _grafana_ to monitor them.

TODO: The template exposes internal metering information.

## Error Handling

Errors, are function's output prime citizens

```json
{
  "statusCode": 500,
  "body": {
    "errorType": "ReferenceError",
    "errorMessage": "x is not defined",
    "trace": [
      "ReferenceError: x is not defined",
      "    at Runtime.exports.handler (/var/task/index.js:2:3)",
      "    at Runtime.handleOnce (/var/runtime/Runtime.js:63:25)",
      "    at process._tickCallback (internal/process/next_tick.js:68:7)"
    ]
  }
}
```

## Environment variables

The following environment variables apply, not that they must be set at the container level

| Name        |                 Description                 |  Default   |
| ----------- | :-----------------------------------------: | :--------: |
| NODE_ENV    |            targeted environment             | production |
| gc_interval | number of ms between each garbage collector |   30000    |
| http_port   |             default server port             |    3000    |

other environment variables apply, please refer to [of-watchdog](https://github.com/openfaas-incubator/) documentation.

## Contributing

This template is written in typescript and compiled to javascript for bundling. Code is targetted to the node12 runtime.
Typescript compilation is purposely left on the host to speed up image generation.

install and build using:

- brew install node
- npm install typescript ts-node
- npm login --registry=https://npm.snapcore.com --scope=@snapcore
- make

Ensure that the build happens properly, then push the code to the git repo

## Recommendations

1. Node12 adds automatic max heap allocation. However, you may still want to use flag '--max-old-space-size' in order to align with the container resources.

2. Consider not running the largest instance you need to handle your workload, but instead distributing it across smaller instances. This allows for progressive rollout to test new versions, reduces the thundering herd when you restart or replace an instance, etc.

3. Don't set up security group rules that limit what addresses can connect to your websocket port. As soon as you do that connection tracking kicks in and you'll hit undocumented hard limits on the number of established connections to an instance. These limits vary based on the instance size and can easily become your bottleneck.

4. Beware of ELBs. Under the hood an ELB is made of multiple load balancers and is supposed to scale out when those load balancers hit capacity. A single load balancer can only handle a certain number of concurrent connections. In my experience ELBs don't automatically scale out when that limit is reached. You need AWS support to manually do that for you. At a certain traffic level, expect support to tell you to create multiple ELBs and distribute traffic across them yourself. ALBs or NLBs may handle this better; I'm not sure. If possible design a mesh network to distribute connections itself instead of requiring a load balancer.
