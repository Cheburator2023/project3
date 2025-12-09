FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-backend:v1.0.1

###build steps
#ARG NPM_REGISTRY
#ARG NPM_EMAIL
#ARG NPM_AUTH
### Logs redirect
##ENV IMAGE_LOGICAL_NAME backend
##RUN mkdir -p /app/logs && touch /app/logs/${IMAGE_LOGICAL_NAME}.txt
##
### Server
##
##WORKDIR /configuration
##COPY configuration/certs/ca-bundle.crt /certs/ca-bundle.crt
##
##WORKDIR /app
#COPY app/package.json /app
##
#RUN rm ~/.npmrc
#
#RUN npm config set audit false && \
#    npm config set chromedriver_skip_download true && \
#    npm config set cafile /certs/ca-bundle.crt && \
#    npm config set always-auth true && \
#    npm config set email ${EMAIL} && \
#    npm config set _auth ${NPM_AUTH} && \
#    npm config set registry https://${NPM_REGISTRY} && \
#    npm i --only-production

COPY app/src /app/src
COPY app/scripts /app/scripts

WORKDIR /configuration
COPY configuration/oracle /configuration/oracle

EXPOSE 4000

ENV NODE_ENV=production
EXPOSE 8443

WORKDIR /app

COPY configuration/tls /tls

CMD ["npm","run","start"]
