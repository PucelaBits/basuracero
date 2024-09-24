import axios from 'axios';

export const obtenerTiposIncidencias = () => {
  return axios.get('/api/incidencias/tipos');
};