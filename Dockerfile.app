FROM registry.openanalytics.eu/proxy/library/node:18.12-alpine
WORKDIR /usr/app
RUN mkdir uploads

ENV PH2_IMAGING_LIB /usr/app/ph2-imaging.jar
ADD https://nexus.openanalytics.eu/service/rest/v1/search/assets?repository=snapshots&group=eu.openanalytics.phaedra&name=phaedra2-imaging&maven.extension=jar&maven.classifier=exec&sort=version $PH2_IMAGING_LIB

RUN apk add imagemagick
ENV IM_IDENTIFY_EXEC identify

ENV NODE_OPTIONS="--max-old-space-size=16384"

COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "src/app.js" ]
