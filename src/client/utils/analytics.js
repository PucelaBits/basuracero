import { getRuntimeConfig } from './runtimeConfig'

// Inicialización de Analytics
export const initializeAnalytics = () => {
  const providers = getRuntimeConfig().ANALYTICS_PROVIDER?.split(',') || [];

  // Inicializar Matomo
  if (providers.includes('matomo')) {
    initializeMatomo();
  }

  // Inicializar Google Analytics
  if (providers.includes('google')) {
    initializeGoogleAnalytics();
  }
};

// Inicialización de Matomo
const initializeMatomo = () => {
  const config = getRuntimeConfig()
  if (!config.MATOMO_URL || !config.MATOMO_SITE_ID) return
  window._paq = window._paq || [];
  window._paq.push(['trackPageView']);
  window._paq.push(['enableLinkTracking']);
  
  const u = config.MATOMO_URL.endsWith('/') ? config.MATOMO_URL : `${config.MATOMO_URL}/`;
  window._paq.push(['setTrackerUrl', u + 'matomo.php']);
  window._paq.push(['setSiteId', config.MATOMO_SITE_ID]);
  
  const d = document;
  const g = d.createElement('script');
  const s = d.getElementsByTagName('script')[0];
  g.async = true;
  g.src = u + 'matomo.js';
  s.parentNode.insertBefore(g, s);
};

// Inicialización de Google Analytics
const initializeGoogleAnalytics = () => {
  const gaId = getRuntimeConfig().GA_ID;
  if (!gaId) return
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', gaId);
  
  window.gtag = gtag;
};

// Enviar eventos
export const enviarEvento = (categoria, accion, nombre = null, valor = null) => {
  const providers = getRuntimeConfig().ANALYTICS_PROVIDER?.split(',') || [];

  // Enviar a Matomo
  if (providers.includes('matomo') && window._paq) {
    window._paq.push(['trackEvent', categoria, accion, nombre, valor]);
  }

  // Enviar a Google Analytics
  if (providers.includes('google') && window.gtag) {
    window.gtag('event', accion, {
      'event_category': categoria,
      'event_label': nombre,
      'value': valor
    });
  }
};

// Para mantener compatibilidad con el código existente
export const enviarEventoMatomo = enviarEvento;
