FROM node:22-slim

WORKDIR /app

RUN mkdir -p /app/data

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "src/server/server.js"]