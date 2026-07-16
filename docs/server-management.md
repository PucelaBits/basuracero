# Administración desde el servidor

Esta guía describe cómo gestionar una instancia de Basura Cero desde terminal cuando no se utiliza el panel web o cuando la operación pertenece a la infraestructura. Para el trabajo cotidiano se recomienda `/admin`: valida entradas, confirma acciones destructivas y registra los cambios en auditoría.

Para backups, despliegues, proxy y rollback consulta [Panel administrativo: operación en producción](production-admin.md).

| Utiliza el panel para | Utiliza el servidor para |
| --- | --- |
| Personalización pública y categorías | Instalación, actualización y migraciones |
| Revisión y edición de incidencias | Secretos, dominio, proxy y CORS |
| Moderación y acciones masivas | Backups, integridad, logs y rollback |
| Administradores y auditoría | Automatización operativa controlada |

## Dos capas de configuración

Basura Cero resuelve la configuración en este orden:

1. Un valor guardado desde `/admin/configuracion` en la tabla SQLite `app_settings`.
2. La variable equivalente del entorno o `.env`.
3. El valor predeterminado de la aplicación.

Por tanto, cambiar `.env` no modifica un ajuste que ya haya sido guardado desde el panel. Esta precedencia permite actualizar la imagen Docker sin perder la personalización de la instancia.

No edites valores de `app_settings` directamente. Si necesitas devolver una clave concreta al fallback de `.env`, sigue el procedimiento de [Volver a utilizar un valor de `.env`](#volver-a-utilizar-un-valor-de-env).

## Equivalencias de configuración pública

| Bloque del panel | Variables usadas como fallback inicial |
| --- | --- |
| Identidad | `APP_NAME`, `APP_SUBTITLE`, `APP_DESCRIPTION` |
| Imágenes de marca | `APP_LOGO_PATH`, `APP_FAVICON_PATH` |
| Colores | `APP_PRIMARY_COLOR`, `APP_SECONDARY_COLOR`, `APP_BACKGROUND_COLOR`, `APP_SUCCESS_COLOR`, `APP_ERROR_COLOR`, `APP_WARNING_COLOR`, `APP_INFO_COLOR` |
| Textos públicos | `VITE_INSTRUCCIONES_REGISTRO`, `VITE_TEXTO_BOTON_RESOLVER`, `VITE_TEXTO_ESTADO_SOLUCIONADO` |
| Enlaces públicos | `APP_SOCIAL_LINKS` |
| Área permitida | `CIUDAD_LAT_MIN`, `CIUDAD_LAT_MAX`, `CIUDAD_LON_MIN`, `CIUDAD_LON_MAX` |
| Centro del mapa | `VITE_MAPA_CENTRO_LAT`, `VITE_MAPA_CENTRO_LON`, `VITE_MAPA_ZOOM_INICIAL` |
| Búsqueda y proximidad | `VITE_SEARCH_REGION_LIMIT_ENABLED`, `VITE_SEARCH_REGION_QUERY`, `VITE_DISTANCIA_MAXIMA_CERCANAS` |
| Resolución | `REPORTES_PARA_SOLUCIONAR`, `DIAS_PARA_CONSIDERAR_ANTIGUA`, `REPORTES_PARA_SOLUCIONAR_ANTIGUA` |
| WhatsApp | `VITE_WHATSAPP_SHARE_ENABLED`, `VITE_WHATSAPP_SHARE_PHONE`, `VITE_WHATSAPP_REQUIRE_ACTIVATION`, `VITE_WHATSAPP_SHARE_BUTTON_TEXT`, `VITE_WHATSAPP_SHARE_DIALOG_TITLE`, `VITE_WHATSAPP_SHARE_DIALOG_TEXT`, `VITE_WHATSAPP_SHARE_DIALOG_NOTE` |
| Friendly Captcha | `friendlycaptcha_enabled`, `VITE_FRIENDLYCAPTCHA_SITEKEY`, `friendlycaptcha_secret` |
| Analítica | `VITE_ANALYTICS_PROVIDER`, `VITE_MATOMO_URL`, `VITE_MATOMO_SITE_ID`, `VITE_GA_ID` |

`TIPOS_INCIDENCIAS_INICIALES` solo sirve para crear las categorías iniciales cuando la tabla está vacía. Después deben gestionarse desde **Categorías** o mediante `npm run tipos -- ...`; cambiar el array no renombra ni elimina categorías existentes.

## Parámetros exclusivos del servidor

Estos valores no se muestran en el panel:

| Variable | Función |
| --- | --- |
| `BASE_URL` | Origen público exacto, sin una ruta final. |
| `HOST`, `PORT` | Interfaz y puerto de escucha. |
| `SESSION_SECRET` | Firma de las sesiones administrativas; mínimo 32 caracteres en producción. |
| `ADMIN_ENABLED` | Sobrescritura explícita de la activación del panel. Normalmente se usa el marcador de `data/`. |
| `ADMIN_BOOTSTRAP_USERNAME` | Usuario que se crea si todavía no existe un administrador activo. |
| `ADMIN_BOOTSTRAP_PASSWORD` | Contraseña temporal para bootstrap manual. `scripts/install.sh` la gestiona y retira automáticamente. |
| `TRUST_PROXY` | Número de proxies inversos de confianza. Usa `1` solo detrás de un único proxy. |
| `CORS_ORIGINS` | Orígenes adicionales autorizados, separados por comas. |
| `ADMIN_SESSION_MAX_AGE_MS` | Duración máxima de inactividad de la sesión administrativa. |
| `APP_UPDATE_REPOSITORY` | Repositorio público consultado por el aviso de actualizaciones. Por defecto `PucelaBits/basuracero`. |
| `APP_UPDATE_BRANCH` | Rama consultada por el aviso. Por defecto `main`. |
| `SQLITE_DB_PATH` | Ruta alternativa de la base SQLite. |
| `UPLOADS_DIR` | Ruta alternativa del directorio de archivos subidos. |

## Aplicar cambios de `.env` con Docker

Edita `.env` y valida la configuración resuelta:

```bash
docker compose config
```

Recrea el servicio para que reciba el nuevo entorno:

```bash
docker compose up -d --force-recreate basuracero-app
docker compose ps
```

Si también ha cambiado el código o la imagen:

```bash
docker compose up -d --build basuracero-app
```

Recuerda que los valores ya presentes en `app_settings` continuarán prevaleciendo.

## Volver a utilizar un valor de `.env`

Este procedimiento elimina únicamente la personalización de una clave para que vuelva a aplicarse su fallback. Haz primero un backup y utiliza el nombre interno mostrado en la primera columna.

```bash
docker compose stop basuracero-app
cp data/incidencias.sqlite "data/incidencias.sqlite.$(date +%Y%m%d-%H%M%S).bak"
sqlite3 data/incidencias.sqlite "SELECT key, updated_at FROM app_settings ORDER BY key;"
sqlite3 data/incidencias.sqlite "DELETE FROM app_settings WHERE key = 'APP_NAME';"
docker compose up -d basuracero-app
```

Comprueba después `/api/config`, la web pública y `/admin/configuracion`. No uses `UPDATE` manual para introducir valores: el panel contiene la validación y la auditoría necesarias.

## Comandos de gestión

En una instalación Docker, antepón `docker compose exec basuracero-app` a los comandos npm.

### Categorías

```bash
npm run tipos -- ls
npm run tipos -- add "Nueva categoría"
npm run tipos -- edit ID "Nuevo nombre"
npm run tipos -- reasignar ID_ORIGEN ID_DESTINO
npm run tipos -- remove ID
```

Los scripts heredados no permiten escoger todos los iconos ni ofrecen el mismo registro de auditoría que el panel.

### Incidencias

```bash
npm run incidencia -- edit-tipo ID_INCIDENCIA ID_CATEGORIA
npm run incidencia -- remove ID_INCIDENCIA
```

El borrado es destructivo. El panel ofrece más contexto, gestiona relaciones e imágenes y debe ser la primera opción.

### Incidencias antiguas

Vista previa sin cambios:

```bash
npm run solucionar-antiguas -- --dias 90 --votos 1 --dry-run
```

Ejecución interactiva:

```bash
npm run solucionar-antiguas -- --dias 90 --votos 1
```

Desde el panel, **Mantenimiento → Incidencias antiguas** permite revisar y seleccionar casos individuales antes de ejecutar.

### Ubicación e imágenes

```bash
npm run rellenar-direcciones
npm run rellenar-barrios
npm run asignar-imagen -- ID RUTA_IMAGEN
```

## Activación y administrador inicial

Para una instalación Docker existente:

```bash
git pull --ff-only origin main
./scripts/enable_admin.sh
```

Para ejecutar manualmente las migraciones y el bootstrap en un entorno ya preparado:

```bash
npm run admin:bootstrap
```

`ADMIN_BOOTSTRAP_PASSWORD` solo se utiliza si no existe ningún administrador activo. En instalaciones Docker nuevas usa `scripts/install.sh`, que la pasa únicamente al contenedor efímero y la retira automáticamente; si haces el bootstrap manualmente, elimínala del entorno al terminar.

## Actualizar la aplicación

Desde la raíz de una instalación Docker ejecuta:

```bash
./scripts/upgrade.sh
```

El script descarga la rama configurada, admite únicamente un avance rápido, realiza un backup coherente con el servicio detenido, reconstruye la imagen y espera al healthcheck. Usa `UPGRADE_REMOTE` o `UPGRADE_BRANCH` únicamente si la instalación sigue deliberadamente otro remoto o rama. El aviso del dashboard es informativo y nunca ejecuta comandos del sistema.

La versión distribuible y sus novedades viven en la última GitHub Release publicada. En el canal estable, el panel solo avisa ante una etiqueta `vMAJOR.MINOR.PATCH` superior y el script instala esa etiqueta; esto permite acumular commits sin publicarlos y evita incorporar trabajo posterior a una entrega. En beta, el panel y el script siguen la punta de la rama. La preferencia se gestiona en la sección independiente **Actualizaciones** y se refleja en `data/update-channel`.

## Consultas de diagnóstico

Las consultas de lectura son útiles para verificar la instancia:

```bash
sqlite3 data/incidencias.sqlite "PRAGMA integrity_check;"
sqlite3 data/incidencias.sqlite "PRAGMA foreign_key_check;"
sqlite3 data/incidencias.sqlite "SELECT estado, COUNT(*) FROM incidencias GROUP BY estado;"
sqlite3 data/incidencias.sqlite "SELECT COUNT(*) AS categorias FROM tipos_incidencias;"
```

No modifiques incidencias, reportes, administradores ni auditoría con SQL directo. Usa el panel, los servicios de la aplicación o los comandos documentados.

## Salud y logs

```bash
docker compose ps
docker compose logs --tail=200 basuracero-app
curl -fsS https://TU_DOMINIO/api/incidencias/ultima-actualizacion
```

Después de cualquier operación comprueba una incidencia existente, una imagen, la web pública y el acceso al panel.
