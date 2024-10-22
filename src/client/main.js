import { createApp } from 'vue'
import { createHead } from '@unhead/vue'
import App from './App.vue'
import routes from './router/index' 
import { createRouter, createWebHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'leaflet/dist/leaflet.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme: {
        dark: false,
        colors: {
          background: '#F5F5F5',
          surface: '#FFFFFF',
          primary: 'hsl(257.92, 42.54%, 35.49%)',
          'primary-darken-1': 'hsl(257.92, 42.54%, 12%)',
          'primary-lighten-1': 'hsl(257.92, 42.54%, 55.49%)',
          secondary: 'hsl(257.14, 24.9%, 50.39%)',
          'secondary-darken-1': 'hsl(257.14, 24.9%, 30.39%)',
          'secondary-lighten-1': 'hsl(257.14, 24.9%, 70.39%)',
        },
      },
    },
  },
})

const router = createRouter({
    history: createWebHistory(),
    routes
})

const head = createHead()

const app = createApp(App)

app.use(router)
app.use(vuetify)
app.use(head)

app.mount('#app')