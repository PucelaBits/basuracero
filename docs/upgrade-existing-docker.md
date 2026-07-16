# Activar el panel administrativo en una instalación Docker existente

Esta guía está dirigida a instalaciones que ya ejecutaban Basura Cero antes de incorporar el panel administrativo. La actualización normal conserva la web pública y mantiene `/admin` desactivado hasta que el operador decide activarlo.

No hay que borrar la base, recrear los volúmenes ni ejecutar migraciones SQL manualmente. El asistente conserva las incidencias y fotografías existentes.

## Antes de empezar

Necesitas:

- acceso al directorio donde está clonado el repositorio;
- Docker y Docker Compose v2;
- acceso de escritura a `data/`, `uploads/` y `.env` con el mismo usuario que ejecuta Compose;
- conexión para descargar imágenes de Docker la primera vez;
- una breve ventana de mantenimiento mientras se reconstruye el contenedor.

Node y npm no son necesarios en el servidor anfitrión. El asistente ejecuta sus tareas auxiliares en `node:22-slim`.

Comprueba primero el estado del checkout:

```bash
cd /srv/basuracero
git status --short
docker compose ps
```

No descartes cambios locales para actualizar. Los ficheros operativos ignorados, como `.env`, `data/` y `uploads/`, deben conservarse.

## 1. Actualizar el código

```bash
git pull --ff-only origin main
```

Si Git rechaza el avance rápido o muestra cambios versionados que entrarían en conflicto, detente y revisa esos cambios antes de continuar.

## 2. Revisar el origen público y el proxy

En `.env`, `BASE_URL` debe ser el origen exacto que utiliza el navegador, sin rutas:

```env
BASE_URL=https://basuracero.example.org
TRUST_PROXY=1
```

Usa `TRUST_PROXY=1` únicamente cuando exista un solo proxy inverso de confianza delante de Node. Si el puerto del contenedor se publica directamente sin proxy, conserva `TRUST_PROXY=false`.

Con Nginx, todas las rutas que terminen en Basura Cero —incluidos los `location` con nombre usados como fallback— deben reenviar al menos:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

El patrón completo está en [`examples/nginx.conf.example`](examples/nginx.conf.example). Define estas cabeceras en el bloque HTTPS común para que las hereden todas las ubicaciones. No fuerces `Origin` desde Nginx y no añadas un `Access-Control-Allow-Origin "*"` global: la aplicación valida los orígenes configurados.

Guarda las copias de configuraciones de Nginx fuera de `sites-enabled`; un fichero adicional dentro de ese directorio puede cargarse como otra configuración activa. Después de adaptar el virtual host:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Activar el panel

Ejecuta el asistente con el mismo usuario que administra el despliegue Docker:

```bash
./scripts/enable_admin.sh
```

El asistente realiza, en este orden:

1. prepara la imagen auxiliar antes de detener el servicio;
2. detiene `basuracero-app` para obtener una copia coherente;
3. guarda SQLite, `uploads/` y `.env` en `backups/admin-enable-FECHA/`;
4. genera un `SESSION_SECRET` robusto si no existía;
5. crea el marcador persistente `data/.admin-enabled`;
6. construye la imagen, ejecuta migraciones idempotentes y crea el primer administrador;
7. arranca el servicio definitivo sin dejar la contraseña bootstrap en su entorno.

Si crea el primer administrador, mostrará una sola vez el usuario y la contraseña temporal. Guárdalos en un gestor de contraseñas y cambia la clave en el primer acceso. Si ya existía un administrador activo, conserva sus credenciales y no se genera otra contraseña.

No ejecutes antes `docker compose down -v`: eliminar volúmenes puede destruir datos. Tampoco es necesario ejecutar `npm run migrate` ni `docker compose up --build`; el asistente ya realiza ambos pasos en el orden seguro.

## 4. Verificar el resultado

```bash
docker compose ps
docker compose logs --tail=200 basuracero-app
curl -fsS https://basuracero.example.org/api/incidencias/ultima-actualizacion
curl -sS -D - -o /dev/null https://basuracero.example.org/admin/login
```

Comprueba que:

- el contenedor aparece como `healthy`;
- la API y la web pública siguen mostrando las incidencias anteriores;
- una fotografía existente continúa accesible;
- `/admin/login` responde con `200`;
- la respuesta contiene una cookie `basuracero_admin` con `HttpOnly`, `Secure` y `SameSite=Strict` cuando se usa HTTPS;
- puedes iniciar sesión, cambiar la contraseña temporal y cerrar sesión.

Después revisa las pantallas de incidencias, categorías, administradores, mantenimiento, auditoría y configuración.

## Cómo se hereda la configuración existente

Activar el panel no copia ni borra de inmediato la personalización de `.env`. Mientras una clave no exista en `app_settings`, la aplicación utiliza su valor actual del entorno como fallback. Por eso, al abrir `/admin/configuracion`, se muestran los valores que ya utilizaba la instalación.

Al guardar el formulario, la configuración administrable se persiste en SQLite y pasa a tener prioridad sobre `.env`. Los secretos operativos como `SESSION_SECRET`, proxy, CORS y ruta de SQLite siguen gestionándose exclusivamente en el entorno. La clave secreta de Friendly Captcha puede actualizarse desde el panel, pero nunca vuelve a mostrarse.

Consulta [Administración desde el servidor](server-management.md) para ver la equivalencia completa entre bloques del panel, variables de entorno y comandos de terminal.

## Si la activación falla

El asistente elimina una activación incompleta y trata de volver a arrancar el servicio público anterior. Corrige la causa y vuelve a ejecutar el mismo script; las migraciones son idempotentes.

Diagnósticos habituales:

- **“se necesita node”**: el checkout está desactualizado; ejecuta `git pull --ff-only origin main`. La versión actual no requiere Node en el anfitrión.
- **`--env-file: invalid env file`**: el activador está desactualizado; la versión actual admite `.env` con valores JSON multilínea.
- **No aparece la contraseña temporal**: ya existe un administrador activo; no se crea otro ni se sustituye su clave.
- **“Origen de la solicitud no permitido”**: confirma que `BASE_URL` coincide con el origen del navegador y que Nginx conserva `Host` y `X-Forwarded-Proto`. No falsifiques la cabecera `Origin` en el proxy.
- **El navegador no conserva la sesión**: inspecciona la respuesta de `/admin/login`; si falta la cookie `Secure`, revisa `TRUST_PROXY=1` y las cabeceras de todas las rutas del proxy.
- **El contenedor no queda saludable**: consulta `docker compose logs --tail=200 basuracero-app` antes de repetir o restaurar.

Para restaurar una versión anterior, sigue el procedimiento coherente de backup y rollback de [`production-admin.md`](production-admin.md). No reviertas migraciones manualmente sobre la base real.
