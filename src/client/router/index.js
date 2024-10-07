import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'
import RankingUsuarios from '../components/RankingUsuarios.vue'
import IncidenciasCercanas from '../components/IncidenciasCercanas.vue'
import TusIncidencias from '../components/TusIncidencias.vue'
import RankingBarrios from '../components/RankingBarrios.vue'
import FavoritasIncidencias from '../components/FavoritasIncidencias.vue'
import MaratonGuide from '../components/MaratonGuide.vue'

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
    props: true,
    meta: {
      title: 'Detalle de Incidencia',
      metaTags: [
        {
          name: 'description',
          content: 'Detalles de la incidencia'
        },
        {
          property: 'og:description',
          content: 'Detalles de la incidencia'
        }
      ]
    }
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
  {
    path: '/ranking/barrios',
    name: 'RankingBarrios',
    component: RankingBarrios
  },
  {
    path: '/favoritas',
    name: 'FavoritasIncidencias',
    component: FavoritasIncidencias,
    props: true
  },
  {
    path: '/organizar-evento',
    name: 'OrganizarEvento',
    component: MaratonGuide
  },
]

export default routes