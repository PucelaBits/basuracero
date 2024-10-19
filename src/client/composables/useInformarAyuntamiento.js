import { enviarEventoMatomo } from '../utils/analytics';

export function useInformarAyuntamiento() {
  const enviarWhatsApp = (incidencia) => {
    const mensaje = `${incidencia.descripcion}\nDirección: ${incidencia.direccion}`;
    const mensajeEncoded = encodeURIComponent(mensaje);
    const url = `https://wa.me/34660010010?text=${mensajeEncoded}`;
    
    // Copiar el mensaje al portapapeles
    navigator.clipboard.writeText(mensaje)
      .then(() => {
        console.log('Mensaje copiado al portapapeles');
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
      });

    enviarEventoMatomo('Incidencia', 'Informe ayuntamiento', `ID: ${incidencia.id}`);
    
    window.open(url, '_blank');
  };

  return {
    enviarWhatsApp
  };
}
