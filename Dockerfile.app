FROM registry.openanalytics.eu/proxy/library/node:21
WORKDIR /usr/app
RUN mkdir uploads

ENV NODE_OPTIONS="--max-old-space-size=16384"

COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "src/app.js" ]
