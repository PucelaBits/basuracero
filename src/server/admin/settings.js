const { all, run } = require('../utils/dbAsync');
const { createAuditLog } = require('./service');

const SETTING_DEFINITIONS = {
  APP_NAME: { fallback: () => process.env.APP_NAME || 'Basura Cero', maxLength: 80 },
  APP_SUBTITLE: { fallback: () => process.env.APP_SUBTITLE || 'Pucela', maxLength: 80 },
  APP_DESCRIPTION: { fallback: () => process.env.APP_DESCRIPTION || 'Sistema colaborativo de incidencias urbanas', maxLength: 240 },
  APP_LOGO_PATH: { fallback: () => process.env.APP_LOGO_PATH || '/img/default/logo.png', type: 'assetPath' },
  APP_FAVICON_PATH: { fallback: () => process.env.APP_FAVICON_PATH || '/img/default/favicon.png', type: 'assetPath' },
  APP_PRIMARY_COLOR: { fallback: () => process.env.APP_PRIMARY_COLOR || '#4b3481', type: 'color' },
  APP_SECONDARY_COLOR: { fallback: () => process.env.APP_SECONDARY_COLOR || '#7361a0', type: 'color' },
  APP_BACKGROUND_COLOR: { fallback: () => process.env.APP_BACKGROUND_COLOR || '#ffffff', type: 'color' },
  APP_SUCCESS_COLOR: { fallback: () => process.env.APP_SUCCESS_COLOR || '#4caf50', type: 'color' },
  APP_ERROR_COLOR: { fallback: () => process.env.APP_ERROR_COLOR || '#f44336', type: 'color' },
  APP_WARNING_COLOR: { fallback: () => process.env.APP_WARNING_COLOR || '#ffc107', type: 'color' },
  APP_INFO_COLOR: { fallback: () => process.env.APP_INFO_COLOR || '#2196f3', type: 'color' },
  VITE_INSTRUCCIONES_REGISTRO: { fallback: () => process.env.VITE_INSTRUCCIONES_REGISTRO || '', maxLength: 300 },
  WHATSAPP_SHARE_ENABLED: { fallback: () => process.env.VITE_WHATSAPP_SHARE_ENABLED || 'false', type: 'boolean' },
  WHATSAPP_SHARE_PHONE: { fallback: () => process.env.VITE_WHATSAPP_SHARE_PHONE || '', type: 'optionalPhone', maxLength: 15 },
  WHATSAPP_REQUIRE_ACTIVATION: { fallback: () => process.env.VITE_WHATSAPP_REQUIRE_ACTIVATION || 'true', type: 'boolean' },
  FRIENDLYCAPTCHA_ENABLED: {
    fallback: () => process.env.friendlycaptcha_enabled || process.env.VITE_FRIENDLYCAPTCHA_ENABLED || (process.env.NODE_ENV === 'production' ? 'true' : 'false'),
    type: 'boolean'
  },
  FRIENDLYCAPTCHA_SITEKEY: { fallback: () => process.env.VITE_FRIENDLYCAPTCHA_SITEKEY || '', maxLength: 200 },
  FRIENDLYCAPTCHA_SECRET: { fallback: () => process.env.friendlycaptcha_secret || '', maxLength: 300, sensitive: true, public: false },
  ANALYTICS_PROVIDER: { fallback: () => process.env.VITE_ANALYTICS_PROVIDER || 'none', type: 'analyticsProvider' },
  MATOMO_URL: { fallback: () => process.env.VITE_MATOMO_URL || '', type: 'optionalUrl', maxLength: 240 },
  MATOMO_SITE_ID: { fallback: () => process.env.VITE_MATOMO_SITE_ID || '', maxLength: 40 },
  GA_ID: { fallback: () => process.env.VITE_GA_ID || '', maxLength: 40 },
  CIUDAD_LAT_MIN: { fallback: () => process.env.CIUDAD_LAT_MIN || '41.5410', type: 'number', min: -90, max: 90 },
  CIUDAD_LAT_MAX: { fallback: () => process.env.CIUDAD_LAT_MAX || '41.7195078', type: 'number', min: -90, max: 90 },
  CIUDAD_LON_MIN: { fallback: () => process.env.CIUDAD_LON_MIN || '-4.8835282', type: 'number', min: -180, max: 180 },
  CIUDAD_LON_MAX: { fallback: () => process.env.CIUDAD_LON_MAX || '-4.6481', type: 'number', min: -180, max: 180 },
  MAPA_CENTRO_LAT: { fallback: () => process.env.VITE_MAPA_CENTRO_LAT || '41.652251', type: 'number', min: -90, max: 90 },
  MAPA_CENTRO_LON: { fallback: () => process.env.VITE_MAPA_CENTRO_LON || '-4.724532', type: 'number', min: -180, max: 180 },
  MAPA_ZOOM_INICIAL: { fallback: () => process.env.VITE_MAPA_ZOOM_INICIAL || '13', type: 'number', min: 1, max: 19 }
};

let cachedSettings = null;

function validateValue(key, rawValue) {
  const definition = SETTING_DEFINITIONS[key];
  if (!definition) throw new Error(`Ajuste no permitido: ${key}`);
  const value = String(rawValue ?? '').trim();
  if (definition.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error('Los colores deben usar el formato hexadecimal #RRGGBB.');
  }
  if (definition.type === 'assetPath' && (!/^\/[a-z0-9_./-]+$/i.test(value) || value.includes('..'))) {
    throw new Error('Las rutas de imagen deben ser rutas publicas absolutas y no pueden contener "..".');
  }
  if (definition.type === 'boolean' && !['true', 'false'].includes(value)) {
    throw new Error(`${key} debe ser true o false.`);
  }
  if (definition.type === 'analyticsProvider' && !['none', 'matomo', 'google', 'matomo,google'].includes(value)) {
    throw new Error('Proveedor de analítica no permitido.');
  }
  if (definition.type === 'optionalUrl' && value && !/^https?:\/\//i.test(value)) {
    throw new Error('La URL de Matomo debe comenzar por http:// o https://.');
  }
  if (definition.type === 'optionalPhone' && value && !/^\d{7,15}$/.test(value)) {
    throw new Error('El teléfono de WhatsApp debe incluir el prefijo internacional y contener solo números.');
  }
  if (definition.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number) || number < definition.min || number > definition.max) {
      throw new Error(`${key} debe estar entre ${definition.min} y ${definition.max}.`);
    }
  }
  if (definition.maxLength && value.length > definition.maxLength) {
    throw new Error(`${key} no puede superar ${definition.maxLength} caracteres.`);
  }
  if (['APP_NAME', 'APP_DESCRIPTION', 'APP_LOGO_PATH', 'APP_FAVICON_PATH'].includes(key) && !value) {
    throw new Error(`${key} es obligatorio.`);
  }
  return value;
}

function sanitizeSettingsForAudit(settings) {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [
    key,
    SETTING_DEFINITIONS[key]?.sensitive ? (value ? '[configurado]' : '[vacio]') : value
  ]));
}

async function getAppSettings({ refresh = false } = {}) {
  if (cachedSettings && !refresh) return { ...cachedSettings };
  const rows = await all('SELECT key, value FROM app_settings');
  const persisted = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  cachedSettings = Object.fromEntries(Object.entries(SETTING_DEFINITIONS).map(([key, definition]) => [
    key,
    persisted[key] === undefined ? definition.fallback() : persisted[key]
  ]));
  return { ...cachedSettings };
}

function getCachedAppSettings() {
  if (cachedSettings) return { ...cachedSettings };
  return Object.fromEntries(Object.entries(SETTING_DEFINITIONS).map(([key, definition]) => [key, definition.fallback()]));
}

async function getPublicSettings() {
  const settings = await getAppSettings();
  return Object.fromEntries(Object.entries(settings).filter(([key]) => SETTING_DEFINITIONS[key]?.public !== false));
}

async function updateAppSettings(input, actingAdminId) {
  const before = await getAppSettings();
  const next = {};
  for (const key of Object.keys(SETTING_DEFINITIONS)) {
    const rawValue = input[key];
    next[key] = SETTING_DEFINITIONS[key].sensitive && !String(rawValue || '').trim()
      ? before[key]
      : validateValue(key, rawValue);
  }
  if (Number(next.CIUDAD_LAT_MIN) >= Number(next.CIUDAD_LAT_MAX) || Number(next.CIUDAD_LON_MIN) >= Number(next.CIUDAD_LON_MAX)) {
    throw new Error('El area geografica debe tener una extension valida, con minimos menores que maximos.');
  }
  if (next.WHATSAPP_SHARE_ENABLED === 'true' && !next.WHATSAPP_SHARE_PHONE) {
    throw new Error('Indica el teléfono que recibirá los reportes por WhatsApp.');
  }
  if (next.FRIENDLYCAPTCHA_ENABLED === 'true' && (!next.FRIENDLYCAPTCHA_SITEKEY || !next.FRIENDLYCAPTCHA_SECRET)) {
    throw new Error('Para activar Friendly Captcha debes indicar la sitekey y la clave secreta.');
  }
  if (next.ANALYTICS_PROVIDER.includes('matomo') && (!next.MATOMO_URL || !next.MATOMO_SITE_ID)) {
    throw new Error('Para activar Matomo debes indicar su URL y el Site ID.');
  }
  if (next.ANALYTICS_PROVIDER.includes('google') && !next.GA_ID) {
    throw new Error('Para activar Google Analytics debes indicar su ID de medición.');
  }
  await run('BEGIN');
  try {
    for (const [key, value] of Object.entries(next)) {
      await run(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value]
      );
    }
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
  cachedSettings = { ...next };
  await createAuditLog(
    actingAdminId,
    'update_app_settings',
    'app_settings',
    'public',
    sanitizeSettingsForAudit(before),
    sanitizeSettingsForAudit(next)
  );
  return { ...next };
}

module.exports = {
  SETTING_DEFINITIONS,
  getAppSettings,
  getCachedAppSettings,
  getPublicSettings,
  updateAppSettings,
  validateValue
};
