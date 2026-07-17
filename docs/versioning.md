# Versionado de releases

Las versiones de Basura Cero se publican **solo** mediante etiquetas y releases de GitHub con el formato `vMAJOR.MINOR.PATCH`.

`package.json` y `package-lock.json` deben conservar siempre la versión congelada `2.3.3`. No se incrementan ni se modifican al publicar una release: hacerlo invalida la capa de dependencias de Docker y obliga a recompilar `sqlite3` en el servidor.

La compilación nativa de `sqlite3` es necesaria, pero vive en la capa cacheada que depende exclusivamente de `package*.json`; con ambos ficheros sin cambios se reutiliza entre despliegues.
