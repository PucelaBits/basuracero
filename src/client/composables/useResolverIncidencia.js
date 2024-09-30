import { ref } from 'vue';
import axios from 'axios';
import { enviarEventoMatomo } from '../utils/analytics';

export function useResolverIncidencia() {
  const reportando = ref(false);
  const mensajeError = ref('');

  const resolverIncidencia = async (incidenciaId, captchaSolution, codigoUnico) => {
    reportando.value = true;
    try {
      enviarEventoMatomo('Incidencia', 'Resolver', `ID: ${incidenciaId}`);
      const response = await axios.post(`/api/incidencias/${incidenciaId}/solucionada`, {
        'frc-captcha-solution': captchaSolution,
        codigoUnico
      });
      reportando.value = false;
      return response.data;
    } catch (error) {
      console.error('Error al marcar como solucionada:', error);
      mensajeError.value = error.response?.data?.error || 'Error al marcar como solucionada';
      reportando.value = false;
      throw error;
    }
  };

  return {
    reportando,
    mensajeError,
    resolverIncidencia
  };
}