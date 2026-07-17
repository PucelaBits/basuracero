import { computed } from 'vue';
import axios from 'axios';
import { enviarEventoMatomo } from '../utils/analytics';
import { getRuntimeConfig } from '../utils/runtimeConfig';

export function useWhatsAppShare() {
  const config = getRuntimeConfig();
  const isEnabled = computed(() => config.WHATSAPP_SHARE_ENABLED === 'true');
  const requiresActivation = computed(() => config.WHATSAPP_REQUIRE_ACTIVATION === 'true');
  const phoneNumber = computed(() => config.WHATSAPP_SHARE_PHONE);
  const buttonText = computed(() => config.WHATSAPP_SHARE_BUTTON_TEXT);
  const reportCountText = (count) => (count === 1
    ? config.WHATSAPP_SHARE_REPORT_COUNT_TEXT_SINGULAR
    : config.WHATSAPP_SHARE_REPORT_COUNT_TEXT_PLURAL.replaceAll('{count}', count));
  const dialogTitle = computed(() => config.WHATSAPP_SHARE_DIALOG_TITLE);
  const dialogText = computed(() => requiresActivation.value
    ? config.WHATSAPP_SHARE_DIALOG_TEXT
    : 'Se abrirá WhatsApp con la información de esta incidencia preparada para enviar.');
  const dialogNote = computed(() => requiresActivation.value
    ? config.WHATSAPP_SHARE_DIALOG_NOTE
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

    // No bloqueamos la apertura: si la telemetría propia falla, WhatsApp debe
    // conservar exactamente el comportamiento actual para la persona usuaria.
    void axios.post(`/api/incidencias/${incidencia.id}/external-report`, {
      channel: 'whatsapp'
    }).catch(() => {});

    enviarEventoMatomo('Incidencia', 'Informe WhatsApp', `ID: ${incidencia.id}`);
    
    window.open(url, '_blank');
  };

  return {
    isEnabled,
    buttonText,
    reportCountText,
    dialogTitle,
    dialogText,
    dialogNote,
    requiresActivation,
    enviarWhatsApp
  };
}
