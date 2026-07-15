import { computed } from 'vue';
import { enviarEventoMatomo } from '../utils/analytics';
import { getRuntimeConfig } from '../utils/runtimeConfig';

export function useWhatsAppShare() {
  const config = getRuntimeConfig();
  const isEnabled = computed(() => config.WHATSAPP_SHARE_ENABLED === 'true');
  const requiresActivation = computed(() => config.WHATSAPP_REQUIRE_ACTIVATION === 'true');
  const phoneNumber = computed(() => config.WHATSAPP_SHARE_PHONE);
  const buttonText = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_BUTTON_TEXT || 'Compartir por WhatsApp');
  const dialogTitle = computed(() => import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_TITLE || 'Compartir por WhatsApp');
  const dialogText = computed(() => requiresActivation.value
    ? (import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_TEXT || 'Se abrirá el WhatsApp del organismo responsable. Envía el primer mensaje para iniciar el bot.')
    : 'Se abrirá WhatsApp con la información de esta incidencia preparada para enviar.');
  const dialogNote = computed(() => requiresActivation.value
    ? (import.meta.env.VITE_WHATSAPP_SHARE_DIALOG_NOTE || 'Después, pega la información de la incidencia en el cuadro de escritura.')
    : 'Revisa el contenido antes de enviarlo.');

  const enviarWhatsApp = (incidencia) => {
    if (!isEnabled.value) return;

    const mensaje = `${incidencia.descripcion}\n Dirección: ${incidencia.direccion_completa.road || incidencia.direccion_completa.neighbourhood || incidencia.direccion_completa.suburb}${incidencia.direccion_completa.house_number ? ` ${incidencia.direccion_completa.house_number}` : ''}`;
    const mensajeInit = 'Importante: manda este mensaje para iniciar el bot. Después, pega la ubicación y descripción de la incidencia.';
    const mensajeEncoded = encodeURIComponent(requiresActivation.value ? mensajeInit : mensaje);
    const url = `https://wa.me/${phoneNumber.value}?text=${mensajeEncoded}`;

    if (requiresActivation.value) {
      navigator.clipboard.writeText(mensaje).catch(() => {});
    }

    enviarEventoMatomo('Incidencia', 'Informe WhatsApp', `ID: ${incidencia.id}`);
    
    window.open(url, '_blank');
  };

  return {
    isEnabled,
    buttonText,
    dialogTitle,
    dialogText,
    dialogNote,
    requiresActivation,
    enviarWhatsApp
  };
}
