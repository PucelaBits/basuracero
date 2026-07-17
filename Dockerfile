FROM node:22-slim AS build

WORKDIR /app

RUN mkdir -p /app/data

COPY package*.json ./

# Esta capa se reutiliza en cada despliegue: package.json y package-lock.json
# deben mantener la versión congelada 2.3.3. Las releases se versionan exclusivamente con
# etiquetas GitHub vMAJOR.MINOR.PATCH; no cambies esos ficheros para publicar.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm ci
# sqlite3 es nativo: se compila una vez en la capa de dependencias cacheada.
# No mover esta instrucción después de COPY . . ni eliminarla.
RUN npm rebuild sqlite3 --build-from-source

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim

WORKDIR /app

COPY --from=build /app /app

# Docker Compose ejecuta el servicio con el UID/GID del administrador del host
# para que los bind mounts no creen ficheros de root. La imagen debe concederle
# también acceso de lectura al código que se ha copiado durante el build.
ARG APP_UID=1000
ARG APP_GID=1000
RUN chown -R "${APP_UID}:${APP_GID}" /app

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

# El servicio no necesita privilegios. Docker Compose ajusta además el UID/GID
# al del administrador del host para que los bind mounts sigan siendo legibles.
USER node

CMD ["npm", "start"]
