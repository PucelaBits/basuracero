// Inicialización de Analytics
export const initializeAnalytics = () => {
  const providers = import.meta.env.VITE_ANALYTICS_PROVIDER?.split(',') || [];

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
  console.log('Initializing Matomo');
  window._paq = window._paq || [];
  window._paq.push(['trackPageView']);
  window._paq.push(['enableLinkTracking']);
  
  const u = import.meta.env.VITE_MATOMO_URL;
  window._paq.push(['setTrackerUrl', u + 'matomo.php']);
  window._paq.push(['setSiteId', import.meta.env.VITE_MATOMO_SITE_ID]);
  
  const d = document;
  const g = d.createElement('script');
  const s = d.getElementsByTagName('script')[0];
  g.async = true;
  g.src = u + 'matomo.js';
  s.parentNode.insertBefore(g, s);
};

// Inicialización de Google Analytics
const initializeGoogleAnalytics = () => {
  console.log('Initializing Google Analytics');
  const gaId = import.meta.env.VITE_GA_ID;
  
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
  const providers = import.meta.env.VITE_ANALYTICS_PROVIDER?.split(',') || [];

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