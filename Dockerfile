FROM node:22-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN rm -rf allure-results/

RUN npm test

CMD ["npm", "run", "exporter"]
