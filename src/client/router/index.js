import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'
import RankingUsuarios from '../components/RankingUsuarios.vue'
import IncidenciasCercanas from '../components/IncidenciasCercanas.vue'
import TusIncidencias from '../components/TusIncidencias.vue'
import RankingBarrios from '../components/RankingBarrios.vue'
import FavoritasIncidencias from '../components/FavoritasIncidencias.vue'
import MaratonGuide from '../components/MaratonGuide.vue'
import PendientesValidar from '../components/PendientesValidar.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: App
  },
  {
    path: '/i/:id',
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
    path: '/incidencia/:id',
    redirect: to => {
      return { path: `/i/${to.params.id}` }
    },
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
  {
    path: '/pendientes',
    name: 'PendientesValidar',
    component: PendientesValidar,
    props: true
  },
]

export default routes