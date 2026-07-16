FROM node:22-slim AS build

WORKDIR /app

RUN mkdir -p /app/data

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm ci
RUN npm rebuild sqlite3 --build-from-source

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim

WORKDIR /app

COPY --from=build /app /app

# 5050 como valor por defecto
ARG PORT=5050
ARG APP_GIT_SHA=unknown
ARG APP_VERSION=unknown
ENV PORT=$PORT
ENV APP_GIT_SHA=$APP_GIT_SHA
ENV APP_VERSION=$APP_VERSION
EXPOSE ${PORT}

ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD ["npm", "start"]
