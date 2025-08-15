#!/usr/bin/env node

/**
 * Script para solucionar incidencias antiguas que tengan al menos un voto de solución
 * 
 * Uso:
 *   npm run solucionar-antiguas [-- opciones]
 * 
 * Opciones:
 *   --dias <numero>        Número de días de antigüedad mínima (por defecto: 90)
 *   --votos <numero>       Número mínimo de votos de solución (por defecto: 1)
 *   --dry-run             Solo mostrar qué se haría sin ejecutar cambios
 *   --help                Mostrar esta ayuda
 * 
 * Ejemplos:
 *   npm run solucionar-antiguas
 *   npm run solucionar-antiguas -- --dias 180 --votos 2
 *   npm run solucionar-antiguas -- --dry-run
 */

const path = require('path');
const fs = require('fs');

// Configurar la ruta de la base de datos
const dbPath = path.join(__dirname, '..', 'data', 'incidencias.sqlite');
const sqlite3 = require('sqlite3').verbose();

// Parsear argumentos de línea de comandos
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    dias: 90,
    votos: 1,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dias':
        options.dias = parseInt(args[++i]);
        if (isNaN(options.dias) || options.dias < 1) {
          console.error('Error: --dias debe ser un número positivo');
          process.exit(1);
        }
        break;
      case '--votos':
        options.votos = parseInt(args[++i]);
        if (isNaN(options.votos) || options.votos < 0) {
          console.error('Error: --votos debe ser un número mayor o igual a 0');
          process.exit(1);
        }
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.error(`Error: Opción desconocida ${args[i]}`);
        console.error('Usa --help para ver las opciones disponibles');
        process.exit(1);
    }
  }

  return options;
}

// Mostrar ayuda
function showHelp() {
  console.log(`
Script para solucionar incidencias antiguas que tengan votos de solución

Uso: npm run solucionar-antiguas [-- opciones]

Opciones:
  --dias <numero>    Número de días de antigüedad mínima (por defecto: 90)
  --votos <numero>   Número mínimo de votos de solución (por defecto: 1)
  --dry-run         Solo mostrar qué se haría sin ejecutar cambios
  --help            Mostrar esta ayuda

Ejemplos:
  npm run solucionar-antiguas
  npm run solucionar-antiguas -- --dias 180 --votos 2
  npm run solucionar-antiguas -- --dry-run

Descripción:
  Este script identifica incidencias que:
  - Tienen al menos X días de antigüedad (desde su fecha de creación)
  - Tienen al menos Y votos de solución de usuarios
  - Están actualmente en estado 'activa'
  
  Y las marca como 'solucionada' estableciendo la fecha de solución actual.
  
Nota: El -- es necesario para pasar argumentos al script cuando se usa npm run.
`);
}

// Formatear fecha para mostrar
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Función principal
async function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🔍 Script para marcar incidencias antiguas como solucionadas');
  console.log('=========================================================');
  console.log(`📅 Días de antigüedad mínima: ${options.dias}`);
  console.log(`🗳️  Votos mínimos de solución: ${options.votos}`);
  console.log(`🔍 Modo: ${options.dryRun ? 'DRY RUN (solo simulación)' : 'EJECUCIÓN REAL'}`);
  console.log('');

  // Verificar que existe la base de datos
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: No se encontró la base de datos en ${dbPath}`);
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Calcular fecha límite
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - options.dias);
    const fechaLimiteString = fechaLimite.toISOString();

    console.log(`🗓️  Buscando incidencias creadas antes del: ${formatDate(fechaLimiteString)}`);
    console.log('');

    // Consulta para encontrar incidencias candidatas
    const query = `
      SELECT 
        i.id,
        i.descripcion,
        i.fecha,
        t.nombre as tipo,
        COUNT(rs.id) as votos_solucion
      FROM incidencias i
      LEFT JOIN tipos_incidencias t ON i.tipo_id = t.id
      LEFT JOIN reportes_solucion rs ON i.id = rs.incidencia_id
      WHERE 
        i.estado = 'activa' 
        AND i.fecha <= ?
      GROUP BY i.id, i.descripcion, i.fecha, t.nombre
      HAVING COUNT(rs.id) >= ?
      ORDER BY i.fecha ASC
    `;

    const incidencias = await new Promise((resolve, reject) => {
      db.all(query, [fechaLimiteString, options.votos], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (incidencias.length === 0) {
      console.log('✅ No se encontraron incidencias que cumplan los criterios.');
      console.log('');
      console.log('💡 Criterios de búsqueda:');
      console.log(`   - Estado: 'activa'`);
      console.log(`   - Antiguedad: más de ${options.dias} días`);
      console.log(`   - Votos de solución: al menos ${options.votos}`);
      return;
    }

    console.log(`📋 Encontradas ${incidencias.length} incidencias que cumplen los criterios:`);
    console.log('');

    // Mostrar incidencias encontradas
    incidencias.forEach((inc, index) => {
      const antiguedad = Math.floor((new Date() - new Date(inc.fecha)) / (1000 * 60 * 60 * 24));
      console.log(`${index + 1}. ID ${inc.id} - ${inc.tipo}`);
      console.log(`   📅 Creada: ${formatDate(inc.fecha)} (${antiguedad} días)`);
      console.log(`   🗳️  Votos: ${inc.votos_solucion}`);
      console.log(`   📝 Descripción: ${inc.descripcion.substring(0, 80)}${inc.descripcion.length > 80 ? '...' : ''}`);
      console.log('');
    });

    if (options.dryRun) {
      console.log('🔍 DRY RUN: No se realizaron cambios en la base de datos.');
      console.log(`✨ Se marcarían ${incidencias.length} incidencias como solucionadas.`);
      return;
    }

    // Confirmar acción
    console.log('⚠️  ¿Estás seguro de que quieres marcar estas incidencias como solucionadas?');
    console.log('   Esta acción no se puede deshacer fácilmente.');
    console.log('');
    console.log('   Escribe "SI" para confirmar:');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('> ', resolve);
    });
    rl.close();

    if (answer.trim() !== 'SI') {
      console.log('❌ Operación cancelada por el usuario.');
      return;
    }

    // Marcar incidencias como solucionadas
    console.log('');
    console.log('🔄 Marcando incidencias como solucionadas...');

    const updateQuery = `
      UPDATE incidencias 
      SET estado = 'solucionada', fecha_solucion = datetime('now', 'localtime')
      WHERE id = ?
    `;

    let procesadas = 0;
    let errores = 0;

    for (const inc of incidencias) {
      try {
        await new Promise((resolve, reject) => {
          db.run(updateQuery, [inc.id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        
        console.log(`✅ ID ${inc.id} marcada como solucionada`);
        procesadas++;
      } catch (error) {
        console.error(`❌ Error al procesar ID ${inc.id}: ${error.message}`);
        errores++;
      }
    }

    console.log('');
    console.log('📊 Resumen de la operación:');
    console.log(`   ✅ Incidencias procesadas correctamente: ${procesadas}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📋 Total encontradas: ${incidencias.length}`);

    if (procesadas > 0) {
      console.log('');
      console.log('🎉 ¡Operación completada exitosamente!');
      console.log(`   Se marcaron ${procesadas} incidencias como solucionadas.`);
    }

  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}
