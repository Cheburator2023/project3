FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-backend:v1.0.0

###build steps
#ARG NPM_REGISTRY
#ARG NPM_EMAIL
#ARG NPM_AUTH
## Logs redirect
#ENV IMAGE_LOGICAL_NAME backend
#RUN mkdir -p /app/logs && touch /app/logs/${IMAGE_LOGICAL_NAME}.txt
#
## Server
#
#WORKDIR /configuration
#COPY configuration/certs/ca-bundle.crt /certs/ca-bundle.crt
#
#WORKDIR /app
#COPY app/package.json /app
#
#
#RUN npm config set audit false
#RUN npm config set chromedriver_skip_download true
#RUN npm config set cafile /certs/ca-bundle.crt
#RUN npm config set always-auth true
#RUN npm config set email ${EMAIL}
#RUN npm config set _auth ${NPM_AUTH}
#RUN npm config set registry ${NPM_REGISTRY}
#RUN npm i --only-production

COPY app/src /app/src

WORKDIR /configuration
COPY configuration/oracle /configuration/oracle

EXPOSE 4000

ENV NODE_ENV=production
EXPOSE 8443

WORKDIR /app

COPY configuration/tls /tls

CMD ["npm","run","start"]
