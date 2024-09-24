const db = require('../src/server/config/database');

const comando = process.argv[2];
let id, nombre, idDestino;

if (comando === 'edit' || comando === 'remove' || comando === 'reasignar') {
  id = process.argv[3];
  if (comando === 'reasignar') {
    idDestino = process.argv[4];
  } else {
    nombre = process.argv.slice(4).join(' ');
  }
} else {
  nombre = process.argv.slice(3).join(' ');
}

if (!comando) {
  console.error('Por favor, proporciona un comando: ls, add, remove, edit, reasignar.');
  process.exit(1);
}

switch (comando) {
  case 'ls':
    listarTipos();
    break;
  case 'edit':
    if (!id || !nombre) {
      console.error('Por favor, proporciona el ID y el nuevo nombre del tipo.');
      process.exit(1);
    }
    editarTipo(id, nombre);
    break;
  case 'add':
    if (!nombre) {
      console.error('Por favor, proporciona el nombre del nuevo tipo.');
      process.exit(1);
    }
    añadirTipo(nombre);
    break;
  case 'remove':
    if (!id) {
      console.error('Por favor, proporciona el ID del tipo a borrar.');
      process.exit(1);
    }
    borrarTipo(id);
    break;
  case 'reasignar':
    if (!id || !idDestino) {
      console.error('Por favor, proporciona el ID de origen y el ID de destino.');
      process.exit(1);
    }
    reasignarIncidencias(id, idDestino);
    break;
  default:
    console.error('Comando no reconocido. Usa: ls, add, remove, edit, reasignar.');
    process.exit(1);
}

function listarTipos() {
  const sql = `SELECT id, nombre FROM tipos_incidencias`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al listar los tipos de incidencias:', err.message);
      process.exit(1);
    }
    console.log('Tipos de incidencias:');
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, Nombre: ${row.nombre}`);
    });
    process.exit(0);
  });
}

function editarTipo(id, nombre) {
  const sql = `UPDATE tipos_incidencias SET nombre = ? WHERE id = ?`;
  db.run(sql, [nombre, id], function (err) {
    if (err) {
      console.error('Error al editar el tipo de incidencia:', err.message);
      process.exit(1);
    }
    console.log(`Tipo de incidencia con ID ${id} actualizado a ${nombre}`);
    process.exit(0);
  });
}

function añadirTipo(nombre) {
  const getMaxIdSql = `SELECT MAX(id) AS maxId FROM tipos_incidencias`;
  db.get(getMaxIdSql, [], (err, row) => {
    if (err) {
      console.error('Error al obtener el ID máximo:', err.message);
      process.exit(1);
    }
    const newId = (row.maxId || 0) + 1;
    const insertSql = `INSERT INTO tipos_incidencias (id, nombre) VALUES (?, ?)`;
    db.run(insertSql, [newId, nombre], function (err) {
      if (err) {
        console.error('Error al añadir el tipo de incidencia:', err.message);
        process.exit(1);
      }
      console.log(`Nuevo tipo de incidencia añadido con ID ${newId} y nombre ${nombre}`);
      process.exit(0);
    });
  });
}

function borrarTipo(id) {
  const checkSql = `SELECT COUNT(*) AS count FROM tipos_incidencias WHERE id = ?`;
  db.get(checkSql, [id], (err, row) => {
    if (err) {
      console.error('Error al verificar el tipo de incidencia:', err.message);
      process.exit(1);
    }
    if (row.count === 0) {
      console.error(`No existe un tipo de incidencia con ID ${id}`);
      process.exit(1);
    } else {
      // Verificar si hay incidencias asociadas a este tipo
      const checkIncidenciasSql = `SELECT COUNT(*) AS count FROM incidencias WHERE tipo_id = ?`;
      db.get(checkIncidenciasSql, [id], (err, row) => {
        if (err) {
          console.error('Error al verificar incidencias asociadas:', err.message);
          process.exit(1);
        }
        if (row.count > 0) {
          console.error(`No se puede borrar el tipo de incidencia con ID ${id} porque tiene incidencias asociadas.`);
          process.exit(1);
        } else {
          const deleteSql = `DELETE FROM tipos_incidencias WHERE id = ?`;
          db.run(deleteSql, [id], function (err) {
            if (err) {
              console.error('Error al borrar el tipo de incidencia:', err.message);
              process.exit(1);
            }
            console.log(`Tipo de incidencia con ID ${id} borrado`);
            process.exit(0);
          });
        }
      });
    }
  });
}

function reasignarIncidencias(idOrigen, idDestino) {
  const checkSql = `SELECT COUNT(*) AS count FROM tipos_incidencias WHERE id = ?`;
  db.get(checkSql, [idDestino], (err, row) => {
    if (err) {
      console.error('Error al verificar el tipo de incidencia de destino:', err.message);
      process.exit(1);
    }
    if (row.count === 0) {
      console.error(`No existe un tipo de incidencia con ID ${idDestino}`);
      process.exit(1);
    } else {
      const updateSql = `UPDATE incidencias SET tipo_id = ? WHERE tipo_id = ?`;
      db.run(updateSql, [idDestino, idOrigen], function (err) {
        if (err) {
          console.error('Error al reasignar las incidencias:', err.message);
          process.exit(1);
        }
        console.log(`Incidencias reasignadas del tipo con ID ${idOrigen} al tipo con ID ${idDestino}`);
        process.exit(0);
      });
    }
  });
}