FROM node:20-slim

# Устанавливаем инструменты для сборки better-sqlite3
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/bot

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]

