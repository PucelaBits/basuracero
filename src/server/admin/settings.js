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
  APP_SOCIAL_LINKS: { fallback: () => process.env.APP_SOCIAL_LINKS || '[]', type: 'socialLinks', maxLength: 4000 },
  VITE_INSTRUCCIONES_REGISTRO: { fallback: () => process.env.VITE_INSTRUCCIONES_REGISTRO || '', maxLength: 300 },
  TEXTO_BOTON_RESOLVER: { fallback: () => process.env.VITE_TEXTO_BOTON_RESOLVER || 'Resolver', maxLength: 40 },
  TEXTO_ESTADO_SOLUCIONADO: { fallback: () => process.env.VITE_TEXTO_ESTADO_SOLUCIONADO || 'Solucionada', maxLength: 40 },
  REPORTES_PARA_SOLUCIONAR: {
    fallback: () => process.env.REPORTES_PARA_SOLUCIONAR || '3',
    type: 'integer',
    min: 1,
    max: 100,
    public: false
  },
  DIAS_PARA_CONSIDERAR_ANTIGUA: {
    fallback: () => process.env.DIAS_PARA_CONSIDERAR_ANTIGUA || '14',
    type: 'integer',
    min: 1,
    max: 3650,
    public: false
  },
  REPORTES_PARA_SOLUCIONAR_ANTIGUA: {
    fallback: () => process.env.REPORTES_PARA_SOLUCIONAR_ANTIGUA || '2',
    type: 'integer',
    min: 1,
    max: 100,
    public: false
  },
  WHATSAPP_SHARE_ENABLED: { fallback: () => process.env.VITE_WHATSAPP_SHARE_ENABLED || 'false', type: 'boolean' },
  WHATSAPP_SHARE_PHONE: { fallback: () => process.env.VITE_WHATSAPP_SHARE_PHONE || '', type: 'optionalPhone', maxLength: 15 },
  WHATSAPP_REQUIRE_ACTIVATION: { fallback: () => process.env.VITE_WHATSAPP_REQUIRE_ACTIVATION || 'true', type: 'boolean' },
  WHATSAPP_SHARE_BUTTON_TEXT: { fallback: () => process.env.VITE_WHATSAPP_SHARE_BUTTON_TEXT || 'Compartir por WhatsApp', maxLength: 80 },
  WHATSAPP_SHARE_DIALOG_TITLE: { fallback: () => process.env.VITE_WHATSAPP_SHARE_DIALOG_TITLE || 'Compartir por WhatsApp', maxLength: 100 },
  WHATSAPP_SHARE_DIALOG_TEXT: { fallback: () => process.env.VITE_WHATSAPP_SHARE_DIALOG_TEXT || 'Se abrirá el WhatsApp del organismo responsable.', maxLength: 300 },
  WHATSAPP_SHARE_DIALOG_NOTE: { fallback: () => process.env.VITE_WHATSAPP_SHARE_DIALOG_NOTE || 'Después, pega la información de la incidencia.', maxLength: 300 },
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
  MAPA_ZOOM_INICIAL: { fallback: () => process.env.VITE_MAPA_ZOOM_INICIAL || '13', type: 'number', min: 1, max: 19 },
  SEARCH_REGION_LIMIT_ENABLED: { fallback: () => process.env.VITE_SEARCH_REGION_LIMIT_ENABLED || 'true', type: 'boolean' },
  SEARCH_REGION_QUERY: { fallback: () => process.env.VITE_SEARCH_REGION_QUERY || '', maxLength: 120 },
  DISTANCIA_MAXIMA_CERCANAS: { fallback: () => process.env.VITE_DISTANCIA_MAXIMA_CERCANAS || '1000', type: 'integer', min: 100, max: 50000 }
};

const SETTING_SECTIONS = {
  identity: [
    'APP_NAME', 'APP_SUBTITLE', 'APP_DESCRIPTION', 'APP_LOGO_PATH', 'APP_FAVICON_PATH',
    'APP_PRIMARY_COLOR', 'APP_SECONDARY_COLOR', 'APP_BACKGROUND_COLOR', 'APP_SUCCESS_COLOR',
    'APP_ERROR_COLOR', 'APP_WARNING_COLOR', 'APP_INFO_COLOR', 'APP_SOCIAL_LINKS',
    'VITE_INSTRUCCIONES_REGISTRO', 'TEXTO_BOTON_RESOLVER', 'TEXTO_ESTADO_SOLUCIONADO'
  ],
  map: [
    'CIUDAD_LAT_MIN', 'CIUDAD_LAT_MAX', 'CIUDAD_LON_MIN', 'CIUDAD_LON_MAX',
    'MAPA_CENTRO_LAT', 'MAPA_CENTRO_LON', 'MAPA_ZOOM_INICIAL',
    'SEARCH_REGION_LIMIT_ENABLED', 'SEARCH_REGION_QUERY', 'DISTANCIA_MAXIMA_CERCANAS'
  ],
  resolution: ['REPORTES_PARA_SOLUCIONAR', 'DIAS_PARA_CONSIDERAR_ANTIGUA', 'REPORTES_PARA_SOLUCIONAR_ANTIGUA'],
  whatsapp: [
    'WHATSAPP_SHARE_ENABLED', 'WHATSAPP_SHARE_PHONE', 'WHATSAPP_REQUIRE_ACTIVATION',
    'WHATSAPP_SHARE_BUTTON_TEXT', 'WHATSAPP_SHARE_DIALOG_TITLE',
    'WHATSAPP_SHARE_DIALOG_TEXT', 'WHATSAPP_SHARE_DIALOG_NOTE'
  ],
  services: [
    'FRIENDLYCAPTCHA_ENABLED', 'FRIENDLYCAPTCHA_SITEKEY', 'FRIENDLYCAPTCHA_SECRET',
    'ANALYTICS_PROVIDER', 'MATOMO_URL', 'MATOMO_SITE_ID', 'GA_ID'
  ],
  texts: ['VITE_INSTRUCCIONES_REGISTRO', 'TEXTO_BOTON_RESOLVER', 'TEXTO_ESTADO_SOLUCIONADO']
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
  if (definition.type === 'socialLinks') {
    let links;
    try {
      links = JSON.parse(value || '[]');
    } catch (_error) {
      throw new Error('Los enlaces públicos no tienen un formato válido.');
    }
    if (!Array.isArray(links) || links.length > 12) {
      throw new Error('Puedes configurar hasta 12 enlaces públicos.');
    }
    const normalized = links.map((link) => {
      const name = String(link?.name || '').trim();
      const url = String(link?.url || '').trim();
      const icon = String(link?.icon || 'mdi-link').trim();
      if (!name || name.length > 60 || !/^(https?:\/\/|mailto:)/i.test(url) || url.length > 300 || !/^mdi-[a-z0-9-]+$/i.test(icon)) {
        throw new Error('Revisa el nombre, la URL y el icono de los enlaces públicos.');
      }
      return { name, url, icon };
    });
    return JSON.stringify(normalized);
  }
  if (definition.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number) || number < definition.min || number > definition.max) {
      throw new Error(`${key} debe estar entre ${definition.min} y ${definition.max}.`);
    }
  }
  if (definition.type === 'integer') {
    const number = Number(value);
    if (!Number.isInteger(number) || number < definition.min || number > definition.max) {
      throw new Error(`${key} debe ser un numero entero entre ${definition.min} y ${definition.max}.`);
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

async function updateAppSettings(input, actingAdminId, { keys = Object.keys(SETTING_DEFINITIONS) } = {}) {
  const before = await getAppSettings();
  const allowedKeys = [...new Set(keys)];
  if (allowedKeys.some((key) => !SETTING_DEFINITIONS[key])) {
    throw new Error('La sección contiene un ajuste no permitido.');
  }
  const next = { ...before };
  for (const key of allowedKeys) {
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
    for (const key of allowedKeys) {
      const value = next[key];
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
  const beforeSection = Object.fromEntries(allowedKeys.map((key) => [key, before[key]]));
  const nextSection = Object.fromEntries(allowedKeys.map((key) => [key, next[key]]));
  await createAuditLog(
    actingAdminId,
    'update_app_settings',
    'app_settings',
    'public',
    sanitizeSettingsForAudit(beforeSection),
    sanitizeSettingsForAudit(nextSection)
  );
  return { ...next };
}

async function updateAppSettingsSection(section, input, actingAdminId) {
  const keys = SETTING_SECTIONS[section];
  if (!keys) throw new Error('Sección de configuración no permitida.');
  return updateAppSettings(input, actingAdminId, { keys });
}

module.exports = {
  SETTING_DEFINITIONS,
  SETTING_SECTIONS,
  getAppSettings,
  getCachedAppSettings,
  getPublicSettings,
  updateAppSettings,
  updateAppSettingsSection,
  validateValue
};
