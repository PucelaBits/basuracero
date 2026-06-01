import axios from 'axios';

export const obtenerTiposIncidencias = () => {
  return axios.get('/api/incidencias/tipos');
};

export const obtenerResumenTiposIncidencias = () => {
  return axios.get('/api/incidencias/tipos/resumen');
};
