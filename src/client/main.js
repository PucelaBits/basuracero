import { createApp } from 'vue'
import App from './App.vue'
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
          primary: '#392763',
          'primary-darken-1': '#1976D2',
          secondary: '#573b96',
          'secondary-darken-1': '#E91E63',
        },
      },
    },
  },
})

createApp(App).use(vuetify).mount('#app')