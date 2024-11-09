const db = require('../src/server/config/database');
const Papa = require('papaparse');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Validación de campos
async function validarRegistro(registro, numeroLinea) {
  const errores = [];
  
  // Validar que tipo_id existe
  if (!registro.tipo_id || isNaN(parseInt(registro.tipo_id))) {
    errores.push(`Línea ${numeroLinea}: tipo_id debe ser un número válido`);
  } else {
    try {
      // Verificar que el tipo existe en la base de datos
      const tipoExiste = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM tipos_incidencias WHERE id = ?', [registro.tipo_id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        });
      });
      
      if (!tipoExiste) {
        errores.push(`Línea ${numeroLinea}: tipo_id ${registro.tipo_id} no existe en la base de datos`);
      }
    } catch (error) {
      errores.push(`Línea ${numeroLinea}: Error al verificar tipo_id: ${error.message}`);
    }
  }
  
  if (!registro.descripcion) {
    errores.push(`Línea ${numeroLinea}: descripción es requerida`);
  } else if (registro.descripcion.length > 500) {
    errores.push(`Línea ${numeroLinea}: descripción excede 500 caracteres`);
  }
  
  const lat = parseFloat(registro.latitud);
  const lon = parseFloat(registro.longitud);
  
  if (isNaN(lat) || lat < -90 || lat > 90) {
    errores.push(`Línea ${numeroLinea}: latitud inválida (debe estar entre -90 y 90)`);
  }
  
  if (isNaN(lon) || lon < -180 || lon > 180) {
    errores.push(`Línea ${numeroLinea}: longitud inválida (debe estar entre -180 y 180)`);
  }
  
  if (!registro.imagen) {
    errores.push(`Línea ${numeroLinea}: imagen es requerida`);
  }
  
  return errores;
}

async function importarIncidencias(rutaCsv, nombreReportador) {
  let rl;
  
  try {
    // Verificar que el archivo existe
    try {
      await fs.access(rutaCsv);
    } catch (error) {
      throw new Error(`El archivo ${rutaCsv} no existe o no es accesible`);
    }

    // Leer el archivo CSV
    const contenido = await fs.readFile(rutaCsv, 'utf-8');
    
    // Parsear CSV
    const resultado = Papa.parse(contenido, {
      header: true,
      skipEmptyLines: true
    });
    
    if (resultado.errors.length > 0) {
      console.error('Errores al parsear el CSV:');
      resultado.errors.forEach(error => console.error(error));
      throw new Error('El archivo CSV contiene errores de formato');
    }

    if (resultado.data.length === 0) {
      throw new Error('El archivo CSV está vacío o no contiene datos válidos');
    }

    // Validar todos los registros primero
    const errores = [];
    for (const [index, registro] of resultado.data.entries()) {
      const erroresRegistro = await validarRegistro(registro, index + 2);
      errores.push(...erroresRegistro);
    }

    if (errores.length > 0) {
      console.error('Errores de validación encontrados:');
      errores.forEach(error => console.error(error));
      throw new Error('Se encontraron errores en los datos del CSV');
    }

    // Confirmar la importación
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const respuesta = await new Promise(resolve => {
      rl.question(`Se importarán ${resultado.data.length} incidencias. ¿Desea continuar? (s/n): `, answer => {
        resolve(answer.toLowerCase());
      });
    });

    if (respuesta !== 's') {
      console.log('Importación cancelada por el usuario');
      process.exit(0);
    }

    // Realizar la importación
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(`
          INSERT INTO incidencias (
            tipo_id, descripcion, latitud, longitud, 
            fecha, estado, codigo_unico, nombre
          ) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), 'activa', ?, ?)
        `);

        const stmtImagen = db.prepare(`
          INSERT INTO imagenes_incidencias (
            incidencia_id, ruta_imagen
          ) VALUES (?, ?)
        `);

        let procesados = 0;
        const total = resultado.data.length;

        resultado.data.forEach((registro) => {
          const codigoUnico = uuidv4();
          
          stmt.run(
            [
              registro.tipo_id,
              registro.descripcion,
              registro.latitud,
              registro.longitud,
              codigoUnico,
              nombreReportador
            ],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(new Error(`Error al insertar incidencia: ${err.message}`));
                return;
              }

              const incidenciaId = this.lastID;
              stmtImagen.run([incidenciaId, registro.imagen], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(new Error(`Error al insertar imagen: ${err.message}`));
                  return;
                }

                procesados++;
                if (procesados === total) {
                  stmt.finalize();
                  stmtImagen.finalize();
                  db.run('COMMIT', (err) => {
                    if (err) {
                      reject(new Error(`Error al confirmar la transacción: ${err.message}`));
                    } else {
                      resolve();
                    }
                  });
                }
              });
            }
          );
        });
      });
    });

    console.log(`Se han importado ${resultado.data.length} incidencias exitosamente`);
    process.exit(0);

  } catch (error) {
    console.error('Error durante la importación:', error.message);
    process.exit(1);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

// Verificar argumentos de línea de comandos
const rutaCsv = process.argv[2];
const nombreReportador = process.argv[3] || process.env.APP_NAME || 'Admin';

if (!rutaCsv) {
  console.error('Debe proporcionar la ruta del archivo CSV');
  console.error('Uso: npm run import-incidencias <ruta-del-csv> [nombre-reportador]');
  console.error('Si no se especifica el nombre-reportador, se usará el APP_NAME del archivo .env');
  process.exit(1);
}

importarIncidencias(rutaCsv, nombreReportador);