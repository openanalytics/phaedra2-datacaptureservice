FROM registry.openanalytics.eu/proxy/library/node:21
WORKDIR /usr/app
RUN mkdir uploads

ENV PH2_IMAGING_LIB /usr/app/ph2-imaging.jar
ADD https://nexus.openanalytics.eu/service/rest/v1/search/assets/download?repository=snapshots&group=eu.openanalytics.phaedra&name=phaedra2-imaging&maven.extension=jar&maven.classifier=exec&sort=version $PH2_IMAGING_LIB

RUN apt update && \
    apt install --no-install-recommends -y imagemagick openjdk-17-jre

ENV IM_IDENTIFY_EXEC identify

RUN mkdir libs
RUN java -jar /usr/app/ph2-imaging.jar copylibs -d /usr/app/libs
ENV LD_LIBRARY_PATH /usr/app/libs

ENV NODE_OPTIONS="--max-old-space-size=16384"

COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "src/app.js" ]
