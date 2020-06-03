
FROM node:14.3.0-alpine3.11 as build

WORKDIR /home/app

RUN mkdir -p /home/app/function
COPY package.json index.js ./
COPY function/ ./function/

RUN echo '//npm.snapcore.com:4873/:_authToken=1T9z3hkWbdxtyiYPqJtj8efFwCq' > `npm config get userconfig` \
    && echo '@snapcore:registry=https://npm.snapcore.com/' >> `npm config get userconfig` \
    && npm install --no-package-lock --production

# COPY function node packages and install, adding this as a separate
# entry allows caching of npm install
WORKDIR /home/app/function
RUN npm install --no-package-lock --production

##### SHIP IMAGE #####
FROM openfaas/of-watchdog:0.7.7 as watchdog
FROM alpine:3.11 as ship

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN apk add --no-cache nodejs-current tini\
    && chmod 777 /tmp \
    && chmod +x /usr/bin/fwatchdog \
    && addgroup -S app && adduser -S -g app app \
    && mkdir -p /home/app/node_modules \
    && mkdir -p /home/app/function

WORKDIR /home/app/

# Move the code in place
COPY --chown=app:app --from=build /home/app/node_modules /home/app/node_modules
COPY --chown=app:app --from=build /home/app/index.js /home/app/package.json /home/app/

ENV function_process="node --nouse-idle-notification --expose-gc index.js"
ENV mode="http"
ENV http_upstream_url="http://127.0.0.1:3000"
ENV http_buffer_req_body="false"
ENV exec_timeout="10s"
ENV write_timeout="15s"
ENV read_timeout="15s"
ENV gc_interval="30000"
ENV max_inflight="0"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["fwatchdog"]

# User changes are kept to the last stage to speed up staged build
COPY --chown=app:app --from=build /home/app/function/ /home/app/function/

USER app
