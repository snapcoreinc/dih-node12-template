
FROM node:14.4.0-alpine3.12 as build

RUN mkdir -p /home/app/module

WORKDIR /home/app

COPY package.json index.js ./
COPY module/ ./module/

# RUN echo '//npm.snapcore.com:4873/:_authToken=1T9z3hkWbdxtyiYPqJtj8efFwCq' > `npm config get userconfig` \
#     && echo '@snapcore:registry=https://npm.snapcore.com/' >> `npm config get userconfig` \
RUN npm install --no-package-lock --production

# COPY module node packages and install, adding this as a separate
# entry allows caching of npm install
WORKDIR /home/app/module
RUN npm install --no-package-lock --production

##### SHIP IMAGE #####

FROM docker.snapcore.com/dih-base-image:latest as ship

RUN apk add --no-cache nodejs-current tini \
    && mkdir -p /home/app/node_modules \
    && mkdir -p /home/app/module

USER app

WORKDIR /home/app/

# Move the code in place
COPY --chown=app:app --from=build /home/app/node_modules /home/app/node_modules
COPY --chown=app:app --from=build /home/app/index.js /home/app/package.json /home/app/


ENV function_process="node --nouse-idle-notification --expose-gc index.js" \
    gc_interval="30000" \
    mode="http" \
    http_upstream_url="http://127.0.0.1:3000" \
    http_buffer_req_body="false" \
    exec_timeout="10s" \
    write_timeout="15s" \
    read_timeout="15s" \
    max_inflight="0"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["fwatchdog"]

# Leaves the changes to the end to leverage multistage
COPY --chown=app:app --from=build /home/app/module /home/app/module