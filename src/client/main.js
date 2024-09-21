import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import DetalleIncidencia from './components/DetalleIncidencia.vue'
import './assets/main.css'
import 'leaflet/dist/leaflet.css'

const routes = [
  { path: '/', component: ListaIncidencias },
  { path: '/i/:id', component: DetalleIncidencia, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')