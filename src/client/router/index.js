import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'
import RankingUsuarios from '../components/RankingUsuarios.vue'
import IncidenciasCercanas from '../components/IncidenciasCercanas.vue'
import TusIncidencias from '../components/TusIncidencias.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: App
  },
  {
    path: '/incidencia/:id',
    name: 'DetalleIncidencia',
    component: DetalleIncidencia,
    props: true
  },
  {
    path: '/ranking',
    name: 'RankingUsuarios',
    component: RankingUsuarios
  },
  {
    path: '/cercanas',
    name: 'IncidenciasCercanas',
    component: IncidenciasCercanas
  },
  {
    path: '/perfil',
    name: 'TusIncidencias',
    component: TusIncidencias,
    props: true
  },
]

export default routes