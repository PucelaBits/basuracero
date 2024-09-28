export const enviarEventoMatomo = (categoria, accion, nombre = null, valor = null) => {
    if (window._paq) {
      window._paq.push(['trackEvent', categoria, accion, nombre, valor]);
    }
};