FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-sum-backend:v2.0.0

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
