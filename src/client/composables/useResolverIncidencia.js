import { ref } from 'vue';
import axios from 'axios';
import { enviarEventoMatomo } from '../utils/analytics';

export function useResolverIncidencia() {
  const reportando = ref(false);
  const mensajeError = ref('');

  const resolverIncidencia = async (id, captchaSolution, codigoUnico, nombre) => {
    reportando.value = true;
    try {
      enviarEventoMatomo('Incidencia', 'Resolver', `ID: ${id}`);
      const response = await axios.post(`/api/incidencias/${id}/solucionada`, {
        'frc-captcha-solution': captchaSolution,
        codigoUnico,
        nombre
      });
      reportando.value = false;
      return {
        solucionada: response.data.solucionada,
        reportes_solucion: response.data.reportes_solucion,
        esAutor: response.data.esAutor || false
      };
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