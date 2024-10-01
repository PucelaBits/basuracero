FROM node:22-slim

WORKDIR /app

RUN mkdir -p /app/data

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5050

ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD ["node", "src/server/server.js"]