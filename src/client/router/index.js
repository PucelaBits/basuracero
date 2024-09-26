import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'
import RankingUsuarios from '../components/RankingUsuarios.vue'

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
  }
]

export default routes