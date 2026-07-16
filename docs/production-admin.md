# Panel administrativo: operación en producción

Para una actualización habitual desde una versión anterior, empieza por la [guía paso a paso para instalaciones Docker existentes](upgrade-existing-docker.md). Este documento conserva la referencia operativa completa y el procedimiento de rollback.

La equivalencia entre el panel, `.env` y los comandos disponibles está en [Administración desde el servidor](server-management.md).

## Modelo de activación

- Una **instalación nueva**, sin `data/incidencias.sqlite`, crea `data/.admin-enabled` antes de inicializar la base y activa el panel por defecto.
- Una **instalación existente** que actualiza desde una versión anterior mantiene `/admin` desactivado aunque las migraciones sean compatibles. La API y la web pública siguen funcionando y no se exige `SESSION_SECRET` mientras el panel permanezca desactivado.
- `ADMIN_ENABLED=true|false` permite una sobrescritura explícita para entornos gestionados, pero el mecanismo recomendado en Docker es el marcador persistente.

### Instalación Docker nueva

Después de copiar `.env.sample` a `.env` y revisar `BASE_URL` y `TRUST_PROXY`, ejecuta:

```bash
./scripts/install.sh
```

El asistente genera `SESSION_SECRET` y una contraseña temporal, ejecuta el bootstrap en un contenedor efímero, limpia la credencial de `.env` y arranca el servicio definitivo sin ella. La contraseña se muestra una sola vez en la terminal y debe cambiarse al entrar en `/admin`; no hace falta editar de nuevo `.env` ni recrear el servicio.

`scripts/install.sh` guarda `data/.installation-complete` al terminar y rechaza una segunda ejecución cuando encuentra ese marcador. Un intento interrumpido antes de completarse puede ejecutarse de nuevo. Para versiones posteriores usa:

```bash
./scripts/upgrade.sh
```

El upgrade solo acepta avances rápidos sobre `main`, rechaza cambios locales versionados, crea un backup antes de modificar el servicio y verifica su salud al terminar. Una ejecución interrumpida deja un marcador de reintento para que el mismo comando vuelva a desplegar la revisión actual.

El canal **estable**, recomendado y predeterminado, compara la versión incluida en la imagen con la última GitHub Release publicada. Solo admite etiquetas `vMAJOR.MINOR.PATCH`; `upgrade.sh` instala esa etiqueta exacta, evitando commits posteriores. El título y la descripción de la Release se muestran en el aviso, así que no publiques la Release hasta que la entrega esté lista para producción.

El canal **beta** es opt-in desde `/admin/updates`. Compara el SHA incluido al construir la imagen con la punta de la rama y avisa ante cualquier cambio; el upgrade instala esa rama mediante avance rápido. La selección se guarda en SQLite y se refleja en `data/update-channel` para que el script de servidor respete la misma preferencia.

La sección **Actualizaciones** aparece como entrada independiente del menú, debajo de **Auditoría**. El administrador puede usar **Comprobar ahora** para invalidar la caché y consultar inmediatamente el canal guardado. La acción está autenticada y protegida mediante CSRF; no ejecuta el upgrade.

### Activar una instalación Docker existente

Desde la raíz del repositorio actualizado ejecuta:

```bash
./scripts/enable_admin.sh
```

El servidor anfitrión solo necesita Docker y Docker Compose v2. Las tareas auxiliares
de Node se ejecutan en un contenedor temporal `node:22-slim`; no es necesario instalar
Node ni npm en el servidor.

El asistente:

1. Detiene el servicio para obtener una copia coherente.
2. Guarda SQLite, `uploads/` y `.env` en `backups/admin-enable-FECHA/`.
3. Genera y guarda un `SESSION_SECRET` robusto si falta.
4. Crea el marcador persistente `data/.admin-enabled`.
5. Construye la imagen y ejecuta migraciones más bootstrap en un contenedor efímero.
6. Arranca el contenedor definitivo sin la contraseña bootstrap en su entorno.
7. Muestra una sola vez en la terminal la URL, usuario y contraseña temporal si creó el primer administrador.

La contraseña nunca se presenta en `/admin` sin autenticación: hacerlo permitiría que el primer visitante de una instancia pública reclamase el panel.

## Configuración pública administrable

La pantalla `/admin/configuracion` persiste identidad, imágenes de marca, paleta, textos y enlaces públicos, área geográfica, búsqueda, proximidad, umbrales de resolución, CAPTCHA, analítica y reporte por WhatsApp en la tabla `app_settings`. Estos valores prevalecen sobre sus equivalentes de `.env` y se sirven en runtime, por lo que basta recargar la web pública después de guardar.

Las rutas de logo y favicon deben apuntar a recursos públicos existentes, por ejemplo `/img/custom/logo.png` o `/uploads/branding/logo.png`. No se aceptan rutas relativas ni segmentos `..`.

No se muestran ni modifican desde el panel `SESSION_SECRET`, credenciales bootstrap, proxy, CORS, SQLite ni rutas internas. Esos valores requieren acceso al entorno de despliegue. La clave secreta de Friendly Captcha puede actualizarse desde el panel, pero nunca se vuelve a mostrar ni se incluye en `/api/config` o en la auditoría.

## Preparacion

1. Deten las escrituras o activa una ventana de mantenimiento.
2. Copia `data/incidencias.sqlite`, `uploads/` y el `.env` vigente a un destino fuera del servidor.
3. Verifica la copia con `sqlite3 backup.sqlite "PRAGMA integrity_check;"`; debe responder `ok`.
4. Restringe `.env`, SQLite y los backups al usuario del servicio (`chmod 600 .env data/incidencias.sqlite` y directorios de backup con modo `700`). El asistente de activación aplica una `umask` restrictiva.
5. En una instalación nueva, `scripts/install.sh` genera `SESSION_SECRET`; `enable_admin.sh` hace lo mismo al activar una instalación existente. En despliegues gestionados, genera un valor distinto por entorno con al menos 32 caracteres. No reutilices secretos entre entornos.
6. Los asistentes generan una contraseña bootstrap segura y la pasan únicamente al contenedor efímero. En un despliegue manual, `ADMIN_BOOTSTRAP_PASSWORD` debe tener al menos 12 caracteres y un máximo de 72 bytes, y no debe permanecer en el entorno del servicio definitivo.
7. Configura `BASE_URL` con el origen HTTPS publico. Mantén `TRUST_PROXY=false` si Node recibe trafico directo; usa `TRUST_PROXY=1` solo detras de un unico proxy de confianza.

### Proxy inverso y cookies seguras

Cuando Nginx termina HTTPS, todas las rutas que llegan a Node deben conservar `Host`, `X-Forwarded-For` y `X-Forwarded-Proto`. Esto incluye ubicaciones con nombre como `location @app`: si el fallback pierde `X-Forwarded-Proto`, Express considera que la petición es HTTP y no entrega la cookie administrativa `Secure`.

Usa el patrón genérico de [`examples/nginx.conf.example`](examples/nginx.conf.example), valida siempre con `nginx -t` y guarda backups fuera de `sites-enabled`. No sobrescribas `Origin` ni publiques un `Access-Control-Allow-Origin "*"` global; la aplicación gestiona su propia política de orígenes.

## Migracion y despliegue

Prueba primero sobre una copia de la base:

```bash
SQLITE_DB_PATH=/ruta/a/copia.sqlite NODE_ENV=test npm run migrate
sqlite3 /ruta/a/copia.sqlite "PRAGMA integrity_check; PRAGMA foreign_key_check;"
```

El runner registra cada fichero en `schema_migrations`; repetir `npm run migrate` es seguro. El arranque de producción ejecuta las migraciones antes de abrir el servidor. Ejecutar migraciones no activa el panel en una instalación existente: la activación depende del marcador.

Checklist de despliegue:

- `npm ci`, `npm audit`, `npm run lint`, `npm test -- --runInBand` y `npm run build` terminan correctamente.
- La copia de seguridad está fechada, accesible y verificada.
- `SESSION_SECRET`, `BASE_URL` y la politica de proxy son correctos.
- `docker compose config` no muestra errores de variables.
- `docker compose up -d --build` crea un contenedor nuevo y `docker compose ps` lo marca como saludable.
- `/api/incidencias/ultima-actualizacion`, la web publica y `/admin/login` responden.
- En HTTPS, `/admin/login` entrega una cookie con `HttpOnly`, `Secure` y `SameSite=Strict`.
- Se validan login, cambio de clave, logout, filtros, ficha, acciones masivas, categorias, administradores, mantenimiento y auditoria.
- Se confirma que la contraseña bootstrap no aparece en logs.
- La imagen no contiene `.env` ni `.npmrc`; ambos se excluyen del contexto y la configuración llega en runtime mediante Compose.

## Verificacion posterior

```bash
docker compose ps
docker compose logs --tail=200 basuracero-app
curl -fsS https://TU_DOMINIO/api/incidencias/ultima-actualizacion
```

Comprueba también `PRAGMA integrity_check`, el recuento de incidencias/categorias y una imagen ya existente. Conserva el backup hasta cerrar la ventana de observacion.

## Rollback

1. Deten el contenedor para evitar nuevas escrituras.
2. Conserva una copia de la base fallida y de los logs para diagnostico.
3. Restaura la imagen o revision anterior de la aplicacion.
4. Restaura conjuntamente la copia de `incidencias.sqlite` y `uploads/`; no mezcles una base restaurada con un directorio de imagenes posterior.
5. Recupera el `.env` anterior, manteniendo secretos fuera del repositorio.
6. Arranca la version anterior y repite salud, integridad, recuentos, web publica y login.

No intentes revertir migraciones con SQL manual sobre la base real. El rollback soportado es restaurar el backup coherente de base, imagenes y configuracion.
