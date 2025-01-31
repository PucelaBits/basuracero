import { ref, computed } from 'vue';
import { enviarEventoMatomo } from '../utils/analytics';

export function useWhatsAppShare() {
  const isEnabled = computed(() => {
    const enabled = import.meta.env.VITE_WHATSAPP_SHARE_ENABLED;
    return enabled === 'true' || enabled === true;
  });
  
  const phoneNumber = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_PHONE);
  const buttonText = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_BUTTON_TEXT || 'Compartir por WhatsApp');
  const dialogTitle = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_TITLE || 'Compartir por WhatsApp');
  const dialogText = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_TEXT || '');
  const dialogNote = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_NOTE || '');

  const enviarWhatsApp = (incidencia) => {
    if (!isEnabled.value) return;

    const mensaje = `${incidencia.descripcion}\n Dirección: ${incidencia.direccion_completa.road || incidencia.direccion_completa.neighbourhood || incidencia.direccion_completa.suburb}${incidencia.direccion_completa.house_number ? ` ${incidencia.direccion_completa.house_number}` : ''}`;
    const mensajeInit = 'Importante 1. Manda este mensaje para iniciar el bot. 2. Pulsa sobre el cuadro de escritura y da Pegar para completar la ubicación e incidencia.';


    const mensajeEncoded = encodeURIComponent(mensajeInit);
    const url = `https://wa.me/${phoneNumber.value}?text=${mensajeEncoded}`;
    
    navigator.clipboard.writeText(mensaje)
      .then(() => {
        console.log('Mensaje copiado al portapapeles');
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
      });

    enviarEventoMatomo('Incidencia', 'Informe WhatsApp', `ID: ${incidencia.id}`);
    
    window.open(url, '_blank');
  };

  return {
    isEnabled,
    buttonText,
    dialogTitle,
    dialogText,
    dialogNote,
    enviarWhatsApp
  };
}