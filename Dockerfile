FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /opt/bot

COPY package*.json ./

RUN npm install --build-from-source

COPY . .

CMD ["node", "bot.js"]


