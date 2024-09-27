import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'
import RankingUsuarios from '../components/RankingUsuarios.vue'
import IncidenciasCercanas from '../components/IncidenciasCercanas.vue'

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
]

export default routes