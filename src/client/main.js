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
          primary: import.meta.env.VITE_APP_PRIMARY_COLOR,
          secondary: import.meta.env.VITE_APP_SECONDARY_COLOR,
          success: import.meta.env.VITE_APP_SUCCESS_COLOR,
          error: import.meta.env.VITE_APP_ERROR_COLOR,
          warning: import.meta.env.VITE_APP_WARNING_COLOR,
          info: import.meta.env.VITE_APP_INFO_COLOR,
          background: import.meta.env.VITE_APP_BACKGROUND_COLOR,
        }
      }
    }
  }
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