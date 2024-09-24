import App from '../App.vue'
import DetalleIncidencia from '../components/DetalleIncidencia.vue'

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
  }
]

export default routes