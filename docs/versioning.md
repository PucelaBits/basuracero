# Versionado de releases

Las versiones de Basura Cero se publican **solo** mediante etiquetas y releases de GitHub con el formato `vMAJOR.MINOR.PATCH`.

`package.json` y `package-lock.json` deben conservar siempre la versión congelada `2.3.3`. No se incrementan ni se modifican al publicar una release: hacerlo invalida la capa de dependencias de Docker y obliga a reinstalar las dependencias en el servidor.

La imagen ejecuta `npm ci` en la capa que depende exclusivamente de `package*.json` y deja que `sqlite3` use su binario precompilado cuando está disponible. El despliegue no ejecuta `npm rebuild sqlite3 --build-from-source`; con los ficheros de paquetes sin cambios, la capa de dependencias se reutiliza.
