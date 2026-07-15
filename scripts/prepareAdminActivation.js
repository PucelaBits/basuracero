const { prepareAdminActivation } = require('../src/server/admin/activation');

const result = prepareAdminActivation();

if (result.adminEnabled && !result.databaseAlreadyExists) {
  console.log('Panel administrativo activado por defecto para la instalacion nueva.');
} else if (!result.adminEnabled) {
  console.log('Panel administrativo desactivado. Ejecuta scripts/enable_admin.sh para activarlo.');
}
