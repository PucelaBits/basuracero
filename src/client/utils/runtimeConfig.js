let runtimeConfig = null

function buildDefaults() {
  return {
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Basura Cero',
    APP_SUBTITLE: import.meta.env.VITE_APP_SUBTITLE || 'Pucela',
    APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Sistema colaborativo de incidencias urbanas',
    APP_LOGO_PATH: import.meta.env.VITE_APP_LOGO_PATH || '/img/default/logo.png',
    APP_FAVICON_PATH: import.meta.env.VITE_APP_FAVICON_PATH || '/img/default/favicon.png',
    APP_PRIMARY_COLOR: import.meta.env.VITE_APP_PRIMARY_COLOR || '#4b3481',
    APP_SECONDARY_COLOR: import.meta.env.VITE_APP_SECONDARY_COLOR || '#7361a0',
    APP_BACKGROUND_COLOR: import.meta.env.VITE_APP_BACKGROUND_COLOR || '#ffffff',
    APP_SUCCESS_COLOR: import.meta.env.VITE_APP_SUCCESS_COLOR || '#4caf50',
    APP_ERROR_COLOR: import.meta.env.VITE_APP_ERROR_COLOR || '#f44336',
    APP_WARNING_COLOR: import.meta.env.VITE_APP_WARNING_COLOR || '#ffc107',
    APP_INFO_COLOR: import.meta.env.VITE_APP_INFO_COLOR || '#2196f3',
    VITE_INSTRUCCIONES_REGISTRO: import.meta.env.VITE_INSTRUCCIONES_REGISTRO || '',
    WHATSAPP_SHARE_ENABLED: import.meta.env.VITE_WHATSAPP_SHARE_ENABLED || 'false',
    WHATSAPP_SHARE_PHONE: import.meta.env.VITE_WHATSAPP_SHARE_PHONE || '',
    WHATSAPP_REQUIRE_ACTIVATION: import.meta.env.VITE_WHATSAPP_REQUIRE_ACTIVATION || 'true',
    FRIENDLYCAPTCHA_ENABLED: import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED || (import.meta.env.PROD ? 'true' : 'false'),
    FRIENDLYCAPTCHA_SITEKEY: import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY || '',
    ANALYTICS_PROVIDER: import.meta.env.VITE_ANALYTICS_PROVIDER || 'none',
    MATOMO_URL: import.meta.env.VITE_MATOMO_URL || '',
    MATOMO_SITE_ID: import.meta.env.VITE_MATOMO_SITE_ID || '',
    GA_ID: import.meta.env.VITE_GA_ID || '',
    CIUDAD_LAT_MIN: import.meta.env.VITE_CIUDAD_LAT_MIN || '41.5410',
    CIUDAD_LAT_MAX: import.meta.env.VITE_CIUDAD_LAT_MAX || '41.7195078',
    CIUDAD_LON_MIN: import.meta.env.VITE_CIUDAD_LON_MIN || '-4.8835282',
    CIUDAD_LON_MAX: import.meta.env.VITE_CIUDAD_LON_MAX || '-4.6481',
    MAPA_CENTRO_LAT: import.meta.env.VITE_MAPA_CENTRO_LAT || '41.652251',
    MAPA_CENTRO_LON: import.meta.env.VITE_MAPA_CENTRO_LON || '-4.724532',
    MAPA_ZOOM_INICIAL: import.meta.env.VITE_MAPA_ZOOM_INICIAL || '13'
  }
}

export async function loadRuntimeConfig() {
  const defaults = buildDefaults()
  try {
    const response = await fetch('/api/config', { cache: 'no-store' })
    runtimeConfig = response.ok ? { ...defaults, ...(await response.json()) } : defaults
  } catch (_error) {
    runtimeConfig = defaults
  }
  return runtimeConfig
}

export function getRuntimeConfig() {
  if (!runtimeConfig) runtimeConfig = buildDefaults()
  return runtimeConfig
}
