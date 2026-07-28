import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { createRouter, createWebHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'leaflet/dist/leaflet.css'
import { initializeAnalytics } from './utils/analytics';
import { loadRuntimeConfig } from './utils/runtimeConfig'
import { prepareDomainMigration } from './utils/domainMigration'

async function bootstrap() {
  const shouldContinue = prepareDomainMigration(import.meta.env.VITE_LEGACY_ORIGIN)
  if (!shouldContinue) return

  const [{ default: App }, { default: routes }] = await Promise.all([
    import('./App.vue'),
    import('./router/index')
  ])
  const runtimeConfig = await loadRuntimeConfig()
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
          primary: runtimeConfig.APP_PRIMARY_COLOR,
          secondary: runtimeConfig.APP_SECONDARY_COLOR,
          success: runtimeConfig.APP_SUCCESS_COLOR,
          error: runtimeConfig.APP_ERROR_COLOR,
          warning: runtimeConfig.APP_WARNING_COLOR,
          info: runtimeConfig.APP_INFO_COLOR,
          background: runtimeConfig.APP_BACKGROUND_COLOR,
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

  initializeAnalytics();

  app.mount('#app')
}

bootstrap()
