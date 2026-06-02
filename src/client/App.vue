<template>
  <v-app>
    <v-app-bar app :color="theme.colors.primary" dark elevation="4" density="compact" @click="scrollToTop" class="clickable-header">
      <v-container class="d-flex align-center pa-0">
        <div class="avatar-logo" aria-hidden="true">
          <img :src="appLogoPath" alt="Logo de la aplicación" class="favicon" @error="restaurarLogoPorDefecto">
        </div>
        <div class="flex-grow-1 text-center">
          <v-toolbar-title class="text-h6 font-weight-bold titulo">{{ appName }}</v-toolbar-title>
          <span class="subtitulo text-caption d-block">{{ appSubtitle }}</span>
        </div>
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" location="right" temporary>
      <v-list>
        <v-list-item to="/perfil" v-if="tieneIncidenciasUsuario">
          <template v-slot:prepend>
            <v-icon>mdi-account-details</v-icon>
          </template>
          <v-list-item-title>Tus enviados</v-list-item-title>
        </v-list-item>
        <v-list-item to="/favoritas" v-if="tieneFavoritos">
          <template v-slot:prepend>
            <v-icon>mdi-star</v-icon>
          </template>
          <v-list-item-title>Tus favoritos</v-list-item-title>
        </v-list-item>
        <v-list-item to="/cercanas">
          <template v-slot:prepend>
            <v-icon>mdi-map-marker-radius</v-icon>
          </template>
          <v-list-item-title>Validar cercanos</v-list-item-title>
        </v-list-item>
        <v-list-item to="/pendientes">
          <template v-slot:prepend>
            <v-icon>mdi-eye-check</v-icon>
          </template>
          <v-list-item-title>Validar pendientes</v-list-item-title>
        </v-list-item>
        <v-list-item to="/tipos" active-class="primary--text">
          <template v-slot:prepend>
            <v-icon>mdi-tag-multiple-outline</v-icon>
          </template>
          <v-list-item-title>Tipos</v-list-item-title>
        </v-list-item>
        <v-list-item @click="abrirRanking">
          <template v-slot:prepend>
            <v-icon>mdi-trophy</v-icon>
          </template>
          <v-list-item-title>Ranking de usuarios</v-list-item-title>
        </v-list-item>
        <v-list-item to="/ranking/barrios" active-class="primary--text">
          <template v-slot:prepend>
            <v-icon>mdi-home-group</v-icon>
          </template>
          <v-list-item-title>Ranking de zonas</v-list-item-title>
        </v-list-item>
        <v-list-item to="/organizar-evento" active-class="primary--text">
          <template v-slot:prepend>
            <v-icon>mdi-calendar-star</v-icon>
          </template>
          <v-list-item-title>Organiza un evento</v-list-item-title>
        </v-list-item>
        <v-list-item 
          v-if="comunidadLink"
          :href="comunidadLink.url" 
          target="_blank"
        >
          <template v-slot:prepend>
            <v-icon>{{ comunidadLink.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ comunidadLink.name }}</v-list-item-title>
        </v-list-item>
        <v-list-item @click="compartir">
          <template v-slot:prepend>
            <v-icon>mdi-share-variant</v-icon>
          </template>
          <v-list-item-title>Compartir</v-list-item-title>
        </v-list-item>

        <!-- Enlaces adicionales del sidebar -->
        <v-list-item 
          v-for="link in sidebarLinks" 
          :key="link.name"
          :href="link.url"
        >
          <template v-slot:prepend>
            <v-icon>{{ link.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ link.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
      
      <!-- Nuevo contenedor para el icono de "Tus datos" -->
      <template v-slot:append>
        <v-list>
          <v-list-item>
            <v-menu offset-y>
              <template v-slot:activator="{ props }">
                <div v-bind="props" class="d-flex align-center">
                  <v-icon icon="mdi-database" size="default" class="mr-8" color="grey"></v-icon>
                  <v-list-item-title color="grey">Tus datos</v-list-item-title>
                </div>
              </template>
              <v-list>
                <v-list-item @click="exportarDatos">
                  <v-list-item-title>Exportar datos</v-list-item-title>
                </v-list-item>
                <v-list-item @click="iniciarImportarDatos">
                  <v-list-item-title>Importar datos</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-0" :class="{ 'desktop-container': !$vuetify.display.mobile }">
        <div class="mapa-wrapper">
          <MapaIncidencias 
            :incidencias="todasLasIncidencias" 
            :incluirSolucionadas="incluirSolucionadas"
            :tipoSeleccionado="tipoSeleccionado"
            :agrupadoPortada="true"
            :seguirUsuario="false"
            @ubicacion-seleccionada="actualizarUbicacion"
            @abrir-formulario="mostrarFormulario = true"
            @incidencia-seleccionada="abrirDetalleIncidencia"
            :ubicacionSeleccionada="ubicacionSeleccionada"
          />
        </div>

        <!-- Banner de notificación -->
        <v-alert
          v-if="incidenciasAntiguasUsuario > 0 || incidenciasConReportesSolucion > 0"
          :color="theme.colors.secondary"
          class="banner-incidencias mx-auto pt-2 pb-4 text-center text-caption"
          density="compact"
          text-align="center"
          style="border-radius: 0;"
        >
          <div style="max-width: 250px; margin: 0 auto;">
            <h3 class="mb-2">Tus enviados</h3>
            <div class="d-flex justify-space-between align-center mb-2" v-if="incidenciasAntiguasUsuario > 0">
              <div class="d-flex align-center">
                <v-icon color="white" size="small" class="mr-2">mdi-clock-alert</v-icon>
                <span>Más antiguo{{ incidenciasAntiguasUsuario !== 1 ? 's' : '' }} de {{ diasParaConsiderarAntigua }} días</span>
              </div>
              <span class="numero-incidencias ml-2">{{ incidenciasAntiguasUsuario }}</span>
            </div>
            <div class="d-flex justify-space-between align-center" v-if="incidenciasConReportesSolucion > 0">
              <div class="d-flex align-center">
                <v-icon color="white" size="small" class="mr-2">mdi-check-circle-outline</v-icon>
                <span>Con votos de {{ textoEstadoSolucionado.toLowerCase() }}</span>
              </div>
              <span class="numero-incidencias ml-2">{{ incidenciasConReportesSolucion }}</span>
            </div>
            <v-btn text color="white" size="small" class="mt-3" @click="$router.push({ name: 'TusIncidencias' })">
              <v-icon color="grey-darken-2 mr-2">mdi-eye-check</v-icon> REVISAR
            </v-btn>
          </div>
        </v-alert>

        <v-dialog 
          v-model="mostrarBanner" 
          max-width="600px" 
          transition="dialog-bottom-transition"
          @update:model-value="manejarCierreBanner"
        >
          <v-card class="welcome-banner pa-0">
            <v-card-text class="text-center">
              <v-avatar size="80" class="mb-4" color="primary">
                <img :src="appLogoPath" alt="Logo {{ appName }}" style="width: 70px; height: 70px;">
              </v-avatar>
              
              <h1 class="text-h5 font-weight-bold mb-4">{{ appName }}</h1>
              
              <p class="text-body-2 mb-6">
                {{ appDescription }}
              </p>
              
              <h2 class="text-subtitle-1 font-weight-medium mb-4">¿Cómo ayudar?</h2>
              
              <v-row justify="center" class="mb-6">
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-camera</v-icon>
                  <div class="text-caption">Detecta el lugar</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-plus-circle</v-icon>
                  <div class="text-caption">Crea un registro</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-check-circle</v-icon>
                  <div class="text-caption">Verifica {{ textoEstadoSolucionado.toLowerCase() }}s</div>
                </v-col>
              </v-row>
              
              <v-btn color="primary" @click="cerrarBanner">
                Empezar a colaborar
              </v-btn>
            </v-card-text>
          </v-card>
        </v-dialog>
        
        <!-- Nuevo bloque para el aviso de instalación -->
        <v-card v-if="mostrarAviso" class="ma-4 custom-banner" color="primary">
          <v-card-text>
            <v-row>
              <v-col class="text-center">
                <v-btn
                  color="white"
                  text
                  @click="instalarPWA"
                >
                  <v-icon class="mr-2">mdi-cellphone</v-icon> Añádeme a tu pantalla principal
                </v-btn>
                <v-btn
                  color="primary"
                  icon="mdi-close"
                  size="smaller"
                  class="close-btn"
                  @click="cerrarAviso"
                >
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="ma-4 pt-0">
          <v-card-text class="pt-2">
            <v-row class="text-grey mt-0 mb-2" align="center" justify="center">
              <v-col cols="auto" class="d-flex align-center mr-4">
                <v-icon color="grey" class="mr-1">mdi-file-document-multiple</v-icon>
                <span>{{ incidenciasActivas }}</span>
              </v-col>
              <v-col cols="auto" class="d-flex align-center mr-4">
                <v-icon color="grey" class="mr-1">mdi-check-circle</v-icon>
                <span>{{ incidenciasSolucionadas }}</span>
              </v-col>
              <v-col cols="auto" class="d-flex align-center">
                <v-icon color="grey" class="mr-1">mdi-account-group</v-icon>
                <span>{{ totalUsuarios }}</span>
              </v-col>
            </v-row>

            <section
              v-if="categoriaSeleccionada"
              class="mb-4 filtro-categoria-banda"
              aria-label="Filtro de categoría activo"
            >
              <div class="filtro-categoria-contenido">
                <div class="filtro-categoria-copy">
                  <span class="filtro-categoria-eyebrow">Mostrando solo</span>
                  <div class="filtro-categoria-resumen">
                    <strong class="filtro-categoria-nombre">{{ categoriaSeleccionada.nombre }}</strong>
                  </div>
                </div>
                <RouterLink to="/" class="ver-todas-link">
                  Volver al mapa completo
                </RouterLink>
              </div>
            </section>

            <v-select
              v-if="!isCategoryRoute"
              v-model="tipoSeleccionado"
              :items="tiposIncidencias"
              item-value="id"
              item-title="nombre"
              label="Filtrar por tipos"
              multiple
              chips
              closable-chips
              @update:model-value="obtenerIncidencias"
            >
              <template v-slot:prepend-item>
                <v-list-item title="Todas" @click="seleccionarTodos" density="compact">
                  <template v-slot:prepend>
                    <v-icon size="small" class="mr-4">mdi-filter-variant</v-icon>
                  </template>
                </v-list-item>
                <v-divider class="mt-2"></v-divider>
              </template>

              <!-- Personalizar cada item del dropdown -->
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" density="compact">
                  <template v-slot:prepend>
                    <v-icon size="small" class="mr-0">{{ item.raw.icono }}</v-icon>
                  </template>
                  <template v-slot:title class="ml-0">
                    {{ item.raw.nombre }}
                  </template>
                </v-list-item>
              </template>
              
              <!-- Personalizar el valor seleccionado (pastillas) -->
              <template v-slot:selection="{ item }">
                <v-icon size="small" class="mr-1">{{ item.raw.icono }}</v-icon>
                <span class="text-caption">{{ item.raw.nombre }}</span>
              </template>

              <!-- Personalizar los chips seleccionados -->
              <template v-slot:chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  class="d-flex align-center"
                >
                  <v-icon size="small" class="mr-1">{{ item.raw.icono }}</v-icon>
                  <span>{{ item.raw.nombre }}</span>
                </v-chip>
              </template>
            </v-select>
            <v-row justify="center" class="mb-0">
              <v-col cols="auto">
                <v-btn-toggle
                  v-model="filtroEstado"
                  mandatory
                  color="primary"
                  rounded="pill"
                  density="compact"
                  elevation="1"
                  @update:model-value="cambiarFiltroEstado"
                >
                  <v-btn value="activas" size="small">Activas</v-btn>
                  <v-btn value="todas" size="small">Todas</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Aviso de incidencias antiguas -->
        <v-card v-if="incidenciasAntiguas > 0 && mostrarAvisoIncidenciasAntiguas" class="ma-4 custom-banner" :color="theme.colors.secondary">
          <v-card-text>
            <v-row>
              <v-col cols="9" class="text-center mx-auto">
                <v-row align="center" justify="center" class="mb-0">
                  <v-col cols="2" align="center" class="pr-0">
                    <v-icon size="x-large">mdi-clock-alert</v-icon>
                  </v-col>
                  <v-col cols="10" align="center" class="pl-2">
                    <span class="text-caption">Hay <strong>{{ incidenciasAntiguas }}</strong> activos<br />más antiguos de {{ diasParaConsiderarAntigua }} días</span>
                  </v-col>
                </v-row>
                <v-row align="center" class="mt-0">
                  <v-col>
                    <v-btn
                      color="white"
                      size="small"
                      text
                      @click="irACercanas"
                    >
                      <v-icon size="large" class="mr-2">mdi-map-marker-radius</v-icon> Ayuda a validar tu zona
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <ListaIncidencias 
          :incidencias="todasLasIncidencias"
          :tipo-seleccionado="tipoSeleccionado"
          :incluir-solucionadas="incluirSolucionadas"
          @incidencia-seleccionada="abrirDetalleIncidencia"
        />
      </v-container>
    </v-main>

    <v-btn
      fab
      :color="theme.colors.secondary"
      fixed
      bottom
      right
      @click="abrirFormularioIncidencia"
      class="floating-btn"
      elevation="8"
      style="margin-bottom: 15px;"
    >
      <v-icon size="x-large">mdi-plus</v-icon>
    </v-btn>

    <v-dialog v-model="mostrarFormulario" max-width="600px" class="dialog-sobre-boton">
      <ReportarIncidencia 
        v-model="mostrarFormulario"
        :ubicacionSeleccionada="ubicacionSeleccionada"
        :datosFormulario="datosFormulario"
        :todasLasIncidencias="todasLasIncidencias"
        @incidencia-creada="incidenciaCreada"
        @seleccionar-en-mapa="seleccionarEnMapa"
        @actualizar-datos="actualizarDatosFormulario"
        @incidencia-seleccionada="abrirDetalleIncidencia"
      />
    </v-dialog>

    <ImageModal ref="imageModal" />

    <v-snackbar 
      v-model="mostrarMensajeExito" 
      :timeout="timeoutSnackbar" 
      :color="colorSnackbar"
      :location="posicionSnackbar"
    >
      {{ mensajeExito }}
    </v-snackbar>

    <DetalleIncidencia 
      v-if="incidenciaSeleccionada" 
      :incidencia="incidenciaSeleccionada"
      v-model="mostrarDetalleIncidencia"
      @cerrar="cerrarDetalleIncidencia"
    />

    <v-footer class="pa-4">
      <v-row justify="center" no-gutters>
        <v-row class="mb-12 text-grey" justify="center" cols="10">
          <v-col cols="1" class="text-center d-flex justify-center align-center">
            <v-icon color="grey" size="x-large">mdi-account-group</v-icon>
          </v-col>
          <v-col cols="9 pl-6">
            <span class="text-caption">Servicio creado por vecinos voluntarios, independiente de cualquier organismo</span>
          </v-col>
        </v-row>
        <v-col 
          v-for="link in socialLinks" 
          :key="link.name"
          class="text-center" 
          cols="4" 
          sm="auto"
        >
          <a 
            :href="link.url" 
            target="_blank" 
            rel="noopener noreferrer"
            class="d-flex align-center justify-center"
          >
            {{ link.name }}
          </a>
        </v-col>
      </v-row>
    </v-footer>

    <!-- Diálogo para iOS -->
    <v-dialog v-model="mostrarDialogoIOS" max-width="400">
      <v-card class="text-caption">
        <v-card-title class="headline">
          <v-icon>mdi-cellphone</v-icon> Cómo añadir en iOS
        </v-card-title>
        <v-card-text>
          <p class="mb-5">Para añadir la aplicación en tu dispositivo iOS</p>
          <p class="mb-2"><img src="/img/ios-share.svg" alt="Imagen de compartir en iOS" class="mr-1"> Toca el icono de compartir en Safari</p>
          <p class="mb-2"><v-icon class="ios-plus-icon mr-1">mdi-plus</v-icon> Desplázate y selecciona "Añadir a la pantalla de inicio"</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            text
            @click="mostrarDialogoIOS = false"
          >
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <RankingUsuarios />
    <TiposIncidencias />
    <IncidenciasCercanas :incidencias="todasLasIncidencias" />
    <TusIncidencias :incidencias="todasLasIncidenciasConSolucionadas" />
    <RankingBarrios />
    <FavoritasIncidencias :incidencias="todasLasIncidenciasConSolucionadas" />
    <PendientesValidar :incidencias="todasLasIncidencias" />

    <v-dialog v-model="mostrarConfirmacionImportar" max-width="400">
      <v-card>
        <v-card-title class="headline">
          Confirmar importación
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que deseas importar datos? Esta acción borrará todos los datos actuales y los reemplazará con los nuevos.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="mostrarConfirmacionImportar = false">
            Cancelar
          </v-btn>
          <v-btn color="primary" @click="confirmarImportarDatos">
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <MaratonGuide v-if="$route.name === 'OrganizarEvento'" />
  </v-app>
</template>
<script>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useHead } from '@unhead/vue'
import { useTheme } from 'vuetify'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import ReportarIncidencia from './components/ReportarIncidencia.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import MapaIncidencias from './components/MapaIncidencias.vue'
import ImageModal from './components/ImageModal.vue'
import DetalleIncidencia from './components/DetalleIncidencia.vue'
import RankingUsuarios from './components/RankingUsuarios.vue'
import TiposIncidencias from './components/TiposIncidencias.vue'
import IncidenciasCercanas from './components/IncidenciasCercanas.vue'
import TusIncidencias from './components/TusIncidencias.vue'
// Importar el método para obtener los tipos de incidencias
import { obtenerTiposIncidencias } from './utils/api'
import { enviarEventoMatomo } from './utils/analytics';
import RankingBarrios from './components/RankingBarrios.vue';
import FavoritasIncidencias from './components/FavoritasIncidencias.vue'
import { useFavoritosStore } from './store/favoritosStore'
import { useIncidenciasUsuarioStore } from './store/incidenciasUsuarioStore'
import { useGestionDatos } from './composables/useGestionDatos';
import MaratonGuide from './components/MaratonGuide.vue'
import PendientesValidar from './components/PendientesValidar.vue'
import { buildCategoryMeta, buildTipoRoute, parseTipoId, sortTiposByConfiguredOrder } from './utils/tipoRoutes'

export default {
  name: 'App',
  components: {
    ReportarIncidencia,
    ListaIncidencias,
    MapaIncidencias,
    ImageModal,
    DetalleIncidencia,
    RankingUsuarios,
    TiposIncidencias,
    IncidenciasCercanas,
    TusIncidencias,
    RankingBarrios,
    FavoritasIncidencias,
    MaratonGuide,
    PendientesValidar,
    RouterLink
  },
  setup() {
    const incidencias = ref([])
    const todasLasIncidencias = ref([])
    const ubicacionSeleccionada = ref({})
    const currentPage = ref(1)
    const totalPages = ref(1)
    const itemsPerPage = 12
    const reportarIncidencia = ref(null)
    const imageModal = ref(null)
    const mensajeExito = ref('')
    const mostrarFormulario = ref(false)
    const incluirSolucionadas = ref(false)
    const incidenciaSeleccionada = ref(null)
    const mostrarMensajeExito = ref(false)
    const mostrarDetalleIncidencia = ref(false)
    const theme = useTheme()
    const route = useRoute()
    const router = useRouter()

    const totalIncidencias = ref(0)
    const tipoSeleccionado = ref([])
    const tiposIncidencias = ref([])
    const isCategoryRoute = computed(() => route.name === 'TipoCategoria')
    const routeCategoryId = computed(() => parseTipoId(route.params.id))
    const baseUrl = computed(() => import.meta.env.VITE_BASE_URL || window.location.origin)

    const textoTotalIncidencias = computed(() => {
      if (incluirSolucionadas.value) {
        return `${totalIncidencias.value} incidencias reportadas`
      } else {
        return `${totalIncidencias.value} incidencias abiertas`
      }
    })

    const TIPOS_INCIDENCIAS_INICIALES = JSON.parse(import.meta.env.VITE_TIPOS_INCIDENCIAS_INICIALES || '[]')
    const categoriaSeleccionada = computed(() => {
      if (!isCategoryRoute.value || routeCategoryId.value === null) {
        return null
      }

      return tiposIncidencias.value.find(tipo => tipo.id === routeCategoryId.value) || null
    })
    const activeTipoIds = computed(() => {
      if (categoriaSeleccionada.value) {
        return [categoriaSeleccionada.value.id]
      }

      return Array.isArray(tipoSeleccionado.value)
        ? tipoSeleccionado.value
          .map(tipo => parseTipoId(tipo))
          .filter(tipo => tipo !== null)
        : []
    })
    const activeTipoParam = computed(() => activeTipoIds.value.join(','))

    const obtenerTipos = async () => {
      try {
        const response = await obtenerTiposIncidencias()
        tiposIncidencias.value = response.data
          .map(tipo => {
            const tipoInicial = TIPOS_INCIDENCIAS_INICIALES.find(t => t.tipo === tipo.nombre)
            return {
              ...tipo,
              icono: tipoInicial?.icono || 'mdi-circle'
            }
          })

        tiposIncidencias.value = sortTiposByConfiguredOrder(
          tiposIncidencias.value,
          TIPOS_INCIDENCIAS_INICIALES
        )

        if (isCategoryRoute.value) {
          sincronizarRutaCategoria()
        } else {
          procesarTiposDeURL()
        }
        await ajustarScrollParaRutaCategoria()
      } catch (error) {
        console.error('Error al obtener tipos de incidencias:', error)
      }
    }

    const cargaInicial = ref(true);

    const ajustarScrollParaRutaCategoria = async () => {
      if (!isCategoryRoute.value) {
        return
      }

      await nextTick()
      scrollToTop()
    }

    const manejarIncidencias = (incidencias) => {
      return incidencias.map(incidencia => ({
        ...incidencia,
        imagen: incidencia.imagenes && incidencia.imagenes.length > 0 ? incidencia.imagenes[0] : null
      }));
    };

    const obtenerIncidencias = async (page = currentPage.value, forzarActualizacion = false) => {
      try {
        const params = {
          page: page,
          limit: itemsPerPage,
          incluirSolucionadas: incluirSolucionadas.value,
        };
        if (activeTipoParam.value) {
          params.tipo = activeTipoParam.value;
        }
        
        if (forzarActualizacion || cargaInicial.value) {
          params._ = Date.now();
        }
        
        const response = await axios.get(`/api/incidencias`, { params });
        
        incidencias.value = manejarIncidencias(response.data.incidencias);
        currentPage.value = response.data.currentPage;
        totalPages.value = response.data.totalPages;
        totalIncidencias.value = response.data.totalItems;

        // Forzar actualización de la vista
        await nextTick();
        incidencias.value = [...incidencias.value];

        await obtenerTodasLasIncidencias(true);
        calcularIncidenciasAntiguasUsuario();
        
        cargaInicial.value = false;
      } catch (error) {
        console.error('Error al obtener incidencias:', error);
      }
    };

    const todasLasIncidenciasConSolucionadas = ref([]);

    const obtenerTodasLasIncidencias = async (forzarActualizacion = false) => {
      try {
        const params = {
          incluirSolucionadas: true,
        };
        if (activeTipoParam.value) {
          params.tipo = activeTipoParam.value;
        }
        
        if (forzarActualizacion) {
          params._ = Date.now();
        }
        
        const response = await axios.get(`/api/incidencias/todas`, { params });
        todasLasIncidencias.value = manejarIncidencias(response.data.incidencias);
        todasLasIncidenciasConSolucionadas.value = manejarIncidencias(response.data.incidencias);
        
        // Actualizar estadísticas aquí
        actualizarEstadisticas(response.data.incidencias);
      } catch (error) {
        console.error('Error al obtener todas las incidencias:', error);
      }
    }

    let intervalId;

    const ultimaActualizacionLocal = ref(Date.now());

    const verificarActualizaciones = async () => {
      try {
        const response = await axios.get('/api/incidencias/ultima-actualizacion');
        const ultimaActualizacion = response.data.ultimaActualizacion;
        
        if (ultimaActualizacion > ultimaActualizacionLocal.value) {
          obtenerIncidencias(currentPage.value, true);
          obtenerTodasLasIncidencias(true);
          ultimaActualizacionLocal.value = ultimaActualizacion;
        } else {
          // No hay nuevas actualizaciones
        }
      } catch (error) {
        console.error('Error al verificar actualizaciones:', error);
      }
    };

    const mostrarAviso = ref(false);
    const esIOS = ref(false);
    const mostrarDialogoIOS = ref(false);
    let eventoInstalacion = null;

    const detectarIOS = () => {
      const userAgent = window.navigator.userAgent;
      esIOS.value = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      if (esIOS.value && localStorage.getItem('avisoInstalacionCerrado') !== 'true') {
        mostrarAviso.value = true;
      }
    };

    const instalarPWA = () => {
      if (esIOS.value) {
        mostrarDialogoIOS.value = true;
        // Enviar evento a Matomo para iOS
        enviarEventoMatomo('PWA', 'Instalación iOS', 'Aceptada');
      } else if (eventoInstalacion) {
        eventoInstalacion.prompt();
        eventoInstalacion.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('Usuario aceptó la instalación');
            mostrarAviso.value = false;
            // Enviar evento a Matomo para instalación aceptada en Android
            enviarEventoMatomo('PWA', 'Instalación Android', 'Aceptada');
          } else {
            console.log('Usuario rechazó la instalación');
            // Enviar evento a Matomo para instalación rechazada en Android
            enviarEventoMatomo('PWA', 'Instalación Android', 'Rechazada');
          }
          eventoInstalacion = null;
        });
      }
    };

    const cerrarAviso = () => {
      mostrarAviso.value = false;
      localStorage.setItem('avisoInstalacionCerrado', 'true');
    };

    const manejarEventoInstalacion = (e) => {
      e.preventDefault();
      eventoInstalacion = e;
      const avisoInstalacionCerrado = localStorage.getItem('avisoInstalacionCerrado');
      if (avisoInstalacionCerrado !== 'true' || esIOS.value) {
        mostrarAviso.value = true;
      }
    };

    const drawer = ref(false);

    const compartir = async () => {
      const contenido = {
        title: pageMeta.value.title,
        text: pageMeta.value.description,
        url: pageMeta.value.url
      };

      try {
        if (navigator.share) {
          // Usar Web Share API si está disponible
          await navigator.share(contenido);
          console.log('Contenido compartido exitosamente');
          enviarEventoMatomo('Incidencia', 'Compartir', 'Éxito - Web Share API');
        } else {
          // Fallback: Copiar al portapapeles
          const textoCompartir = `${contenido.title}\n\n${contenido.text}\n\n${contenido.url}`;
          await navigator.clipboard.writeText(textoCompartir);
          
          // Mostrar snackbar de éxito
          mensajeExito.value = '¡Enlace copiado al portapapeles!';
          colorSnackbar.value = 'success';
          mostrarMensajeExito.value = true;
          
          enviarEventoMatomo('Incidencia', 'Compartir', 'Éxito - Portapapeles');
        }
      } catch (error) {
        console.error('Error al compartir:', error);
        
        // Intentar fallback secundario con execCommand (para navegadores más antiguos)
        try {
          const textarea = document.createElement('textarea');
          const textoCompartir = `${contenido.title}\n\n${contenido.text}\n\n${contenido.url}`;
          textarea.value = textoCompartir;
          textarea.style.position = 'fixed';  // Fuera de la vista
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          
          // Mostrar snackbar de éxito
          mensajeExito.value = '¡Enlace copiado al portapapeles!';
          colorSnackbar.value = 'success';
          mostrarMensajeExito.value = true;
          
          enviarEventoMatomo('Incidencia', 'Compartir', 'Éxito - Portapapeles');
        } catch (error) {
          console.error('Error al copiar al portapapeles:', error);
        }
      }
    };

    const mostrarRanking = ref(false);

    const abrirRanking = () => {
      router.push('/ranking')
      drawer.value = false // Cerrar el drawer después de la navegación
    }

    const datosFormulario = ref({
      tipo_id: '',
      descripcion: '',
      latitud: null,
      longitud: null,
      imagen: null,
      nombre: ''
    });

    const actualizarDatosFormulario = (nuevosDatos) => {
      datosFormulario.value = { ...datosFormulario.value, ...nuevosDatos };
    };

    const reiniciarDatosFormulario = () => {
      datosFormulario.value = {
        tipo_id: '',
        descripcion: '',
        latitud: null,
        longitud: null,
        imagen: null,
        nombre: ''
      };
    };

    const incidenciaCreada = (id) => {
      obtenerIncidencias(currentPage.value, true);
      obtenerTodasLasIncidencias(true);
      ultimaActualizacionLocal.value = Date.now();
      mostrarFormulario.value = false;
      
      // Abrir la URL de la incidencia y pasar un parámetro para mostrar el diálogo
      router.push({ 
        name: 'DetalleIncidencia', 
        params: { id: id },
        query: { mostrarDialogoExito: 'true' }
      });
      
      reiniciarDatosFormulario();
    }

    const mostrarBanner = ref(true)

    const cerrarBanner = () => {
      mostrarBanner.value = false
      guardarPreferenciaBanner()
    }

    const guardarPreferenciaBanner = () => {
      localStorage.setItem('bannerBienvenidaVisto', 'true')
    }

    const manejarCierreBanner = (valor) => {
      if (!valor) {
        guardarPreferenciaBanner()
      }
    }

    const totalIncidenciasUsuario = ref(0)
    const incidenciasSolucionadasUsuario = ref(0)

    const { incidenciasUsuario, loadIncidenciasUsuario } = useIncidenciasUsuarioStore()

    const obtenerIncidenciasUsuario = async () => {
      await loadIncidenciasUsuario()
      const incidenciasIds = incidenciasUsuario.value.map(id => id.toString());

      totalIncidenciasUsuario.value = incidenciasIds.length;

      // Obtener todas las incidencias, incluyendo las solucionadas
      const todasLasIncidencias = await todasLasIncidenciasConSolucionadas.value;

      // Contar incidencias solucionadas
      incidenciasSolucionadasUsuario.value = todasLasIncidencias.filter(inc => 
        incidenciasIds.includes(inc.id.toString()) && inc.estado === 'solucionada'
      ).length;
    };

    const incidenciasAntiguasUsuario = ref(0);
    const incidenciasConReportesSolucion = ref(0);

    const diasParaConsiderarAntigua = parseInt(import.meta.env.VITE_DIAS_PARA_CONSIDERAR_ANTIGUA) || 7;

    const calcularIncidenciasAntiguasUsuario = () => {
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - diasParaConsiderarAntigua);
      
      // Verificar si incidenciasUsuario.value es un array
      const incidenciasIds = Array.isArray(incidenciasUsuario.value) 
        ? incidenciasUsuario.value.map(id => id.toString())
        : [];

      incidenciasAntiguasUsuario.value = todasLasIncidencias.value.filter(incidencia => 
        incidenciasIds.includes(incidencia.id.toString()) &&
        incidencia.estado === 'activa' &&
        new Date(incidencia.fecha) < diasAtras
      ).length;

      incidenciasConReportesSolucion.value = todasLasIncidencias.value.filter(incidencia => 
        incidenciasIds.includes(incidencia.id.toString()) &&
        incidencia.estado === 'activa' &&
        (incidencia.reportes_solucion > 0)
      ).length;
    };

    // Asegúrate de llamar a esta función cuando se carguen las incidencias
    watch([todasLasIncidencias, incidenciasUsuario], calcularIncidenciasAntiguasUsuario, { immediate: true });

    onMounted(async () => {
      // Verificar si el banner ya fue visto antes de mostrarlo
      const bannerVisto = localStorage.getItem('bannerBienvenidaVisto')
      mostrarBanner.value = bannerVisto !== 'true'
      
      await obtenerTipos()
      await obtenerIncidencias(1, true)
      
      // Verificar actualizaciones cada 30 segundos
      intervalId = setInterval(verificarActualizaciones, 30000);

      detectarIOS();
      window.addEventListener('beforeinstallprompt', manejarEventoInstalacion);

      obtenerIncidenciasUsuario();
      calcularIncidenciasAntiguasUsuario();
    });

    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      window.removeEventListener('beforeinstallprompt', manejarEventoInstalacion);
    });

    watch(() => tipoSeleccionado.value, async () => {
      await obtenerIncidencias(1, true);
    });

    watch(() => incluirSolucionadas.value, async () => {
      await obtenerIncidencias(1, true);
      await obtenerTodasLasIncidencias(true);
    });

    watch(() => route.params.id, (newId) => {
      if (route.name === 'DetalleIncidencia' && newId) {
        abrirDetalleIncidenciaPorId(newId)
      }
    })

    watch(
      () => [route.name, route.params.id, route.params.slug],
      async () => {
        if (tiposIncidencias.value.length === 0) {
          return
        }

        if (isCategoryRoute.value) {
          sincronizarRutaCategoria()
        } else {
          procesarTiposDeURL()
        }

        await obtenerIncidencias(1, true)
        await ajustarScrollParaRutaCategoria()
      }
    )

    const actualizarLista = () => {
      obtenerIncidencias()
      mensajeExito.value = 'Incidencia añadida con éxito'
      mostrarMensajeExito.value = true
      setTimeout(() => {
        mensajeExito.value = ''
      }, 3000)
    }

    const actualizarUbicacion = (ubicacion) => {
      ubicacionSeleccionada.value = ubicacion
      mostrarFormulario.value = true  // Abre el formulario automáticamente
      // Scroll al formulario y focus en el primer campo
      setTimeout(() => {
        const formulario = document.querySelector('.reportar-incidencia')
        if (formulario) {
          formulario.scrollIntoView({ behavior: 'smooth' })
          const primerInput = formulario.querySelector('input, select, textarea')
          if (primerInput) primerInput.focus()
        }
      }, 100)
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
        obtenerIncidencias()
      }
    }

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
        obtenerIncidencias()
      }
    }

    const openImageModal = (imageUrl) => {
      imageModal.value.open(imageUrl)
    }

    // Exponer la función globalmente
    window.openImageModal = openImageModal

    const abrirDetalleIncidencia = (incidencia) => {
      incidenciaSeleccionada.value = incidencia;
      mostrarDetalleIncidencia.value = true;
      router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } });
    }

    const abrirDetalleIncidenciaPorId = async (id) => {
      try {
        const response = await axios.get(`/api/incidencias/${id}`)
        abrirDetalleIncidencia(response.data)
      } catch (error) {
        console.error('Error al obtener la incidencia:', error.response ? error.response.data : error.message)
      }
    }

    const cerrarDetalleIncidencia = () => {
      mostrarDetalleIncidencia.value = false;
      incidenciaSeleccionada.value = null;

      const currentRoute = router.currentRoute.value;
      const previousRoute = router.options.history.state.back;
      const resolvedPreviousRoute = previousRoute ? router.resolve(previousRoute) : null;
      const canReturnToPreviousRoute = resolvedPreviousRoute
        && resolvedPreviousRoute.name
        && resolvedPreviousRoute.name !== 'DetalleIncidencia'
        && resolvedPreviousRoute.fullPath !== currentRoute.fullPath;

      if (canReturnToPreviousRoute) {
        router.push(previousRoute);
      } else if (currentRoute.name !== 'Home') {
        router.push({ name: 'Home' });
      }
    };

    const seleccionarEnMapa = () => {
      mostrarFormulario.value = false;
      nextTick(() => {
        scrollToTop();
        mostrarSnackbar('👆 Haz clic en cualquier parte del mapa', 'warning', 3000, 'top');
      });
    };

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const abrirFormularioIncidencia = () => {
      mostrarFormulario.value = true;
      enviarEventoMatomo('Incidencia', 'Nueva', 'Botón +');
    };

    const tieneIncidenciasUsuario = computed(() => {
      return Object.keys(localStorage).some(key => key.startsWith('incidencia_'));
    });

    const abrirTusIncidencias = () => {
      router.push('/perfil')
      drawer.value = false // Cerrar el drawer después de la navegación
    }

    const incidenciasAntiguas = computed(() => {
      const unaSemanaAtras = new Date();
      unaSemanaAtras.setDate(unaSemanaAtras.getDate() - diasParaConsiderarAntigua);
      
      return todasLasIncidencias.value.filter(incidencia => 
        incidencia.estado === 'activa' && new Date(incidencia.fecha) < unaSemanaAtras
      ).length;
    });

    const mostrarAvisoIncidenciasAntiguas = ref(true);

    const irACercanas = () => {
      if (categoriaSeleccionada.value) {
        router.push({
          name: 'IncidenciasCercanas',
          query: {
            tipo: String(categoriaSeleccionada.value.id)
          }
        });
        return;
      }

      router.push('/cercanas');
    };

    // Actualizar cuando cambien las incidencias
    watch(todasLasIncidenciasConSolucionadas, () => {
      obtenerIncidenciasUsuario();
    });

    const incidenciasActivas = computed(() => {
      return todasLasIncidencias.value.filter(inc => inc.estado === 'activa').length;
    });

    const incidenciasSolucionadas = ref(0);
    const totalUsuarios = ref(0);

    const actualizarEstadisticas = (incidencias) => {
      incidenciasSolucionadas.value = incidencias.filter(inc => inc.estado === 'solucionada').length;
      const usuariosUnicos = new Set(incidencias.map(inc => inc.nombre));
      totalUsuarios.value = usuariosUnicos.size;
    };

    const { favoritos } = useFavoritosStore()

    const tieneFavoritos = computed(() => favoritos.value.length > 0)

    const filtroEstado = ref('activas')
    
    const cambiarFiltroEstado = () => {
      incluirSolucionadas.value = filtroEstado.value === 'todas'
      obtenerIncidencias(1, true)
    }

    const mostrarConfirmacionImportar = ref(false);
    const { exportarDatos, importarDatos } = useGestionDatos();

    const iniciarImportarDatos = () => {
      mostrarConfirmacionImportar.value = true;
    };

    const confirmarImportarDatos = async () => {
      mostrarConfirmacionImportar.value = false;
      await importarDatos();
      // Aquí puedes añadir lógica adicional después de la importación si es necesario
    };

    const timeoutSnackbar = ref(3000)
    const colorSnackbar = ref('success')
    const posicionSnackbar = ref('bottom')

    const mostrarSnackbar = (mensaje, color = 'success', timeout = 3000, posicion = 'bottom') => {
      mensajeExito.value = mensaje;
      colorSnackbar.value = color;
      timeoutSnackbar.value = timeout;
      posicionSnackbar.value = posicion;
      mostrarMensajeExito.value = true;
    };

    // Definir las variables de entorno como refs o computed
    const appName = ref(import.meta.env.VITE_APP_NAME || 'Basura Cero')
    const appSubtitle = ref(import.meta.env.VITE_APP_SUBTITLE || 'Pucela')
    const appDescription = ref(import.meta.env.VITE_APP_DESCRIPTION || 'Sistema colaborativo de incidencias urbanas en Valladolid')
    const pageMeta = computed(() => {
      if (categoriaSeleccionada.value) {
        return buildCategoryMeta({
          appName: appName.value,
          appDescription: appDescription.value,
          baseUrl: baseUrl.value,
          tipo: categoriaSeleccionada.value
        })
      }

      return {
        title: `${appName.value} - ${appDescription.value}`,
        description: appDescription.value,
        url: window.location.href
      }
    })

    useHead(() => ({
      title: pageMeta.value.title,
      meta: [
        { name: 'description', content: pageMeta.value.description },
        { property: 'og:title', content: pageMeta.value.title },
        { property: 'og:description', content: pageMeta.value.description },
        { property: 'og:url', content: pageMeta.value.url },
        { name: 'twitter:title', content: pageMeta.value.title },
        { name: 'twitter:description', content: pageMeta.value.description },
        { name: 'twitter:url', content: pageMeta.value.url }
      ],
      link: [
        { rel: 'canonical', href: pageMeta.value.url }
      ]
    }))

    const socialLinks = ref(JSON.parse(import.meta.env.VITE_APP_SOCIAL_LINKS || '[]'))

    // Encontrar el enlace de comunidad si existe
    const comunidadLink = computed(() => 
      socialLinks.value.find(link => link.name.toLowerCase() === 'comunidad')
    )

    const defaultAppLogoPath = '/img/default/logo.png'
    const appLogoPath = ref(import.meta.env.VITE_APP_LOGO_PATH || defaultAppLogoPath)

    const restaurarLogoPorDefecto = (event) => {
      if (appLogoPath.value !== defaultAppLogoPath) {
        appLogoPath.value = defaultAppLogoPath
        return
      }

      if (event?.target) {
        event.target.style.display = 'none'
      }
    }

    const sincronizarRutaCategoria = () => {
      if (!isCategoryRoute.value) {
        return
      }

      if (routeCategoryId.value === null) {
        tipoSeleccionado.value = []
        router.replace({ name: 'Home' })
        return
      }

      const tipo = tiposIncidencias.value.find(item => item.id === routeCategoryId.value)
      if (!tipo) {
        tipoSeleccionado.value = []
        router.replace({ name: 'Home' })
        return
      }

      tipoSeleccionado.value = [tipo.id]

      const canonicalRoute = buildTipoRoute(tipo.id, tipo.nombre)
      if (route.params.slug !== canonicalRoute.params.slug) {
        router.replace(canonicalRoute)
      }
    }

    const seleccionarTodos = () => {
      if (isCategoryRoute.value) {
        return
      }

      if (tipoSeleccionado.value.length === tiposIncidencias.value.length) {
        tipoSeleccionado.value = []
      } else {
        tipoSeleccionado.value = tiposIncidencias.value.map(tipo => tipo.id)
      }
      obtenerIncidencias()
    }

    const MAX_TIPOS_PERMITIDOS = 10

    const ultimaActualizacion = ref(Date.now())
    const MIN_TIEMPO_ENTRE_UPDATES = 1000 // 1 segundo

    const sanitizarTipo = (tipo) => {
      // Convertir a string y escapar caracteres especiales si es necesario
      return String(tipo).replace(/[<>'"]/g, '')
    }

    const procesarTiposDeURL = () => {
      try {
        if (isCategoryRoute.value) return

        const tiposQuery = route.query.tipos
        if (!tiposQuery) {
          tipoSeleccionado.value = []
          return
        }
        
        // Validar que sea un string
        if (typeof tiposQuery !== 'string') return
        
        // Validar formato y longitud máxima
        if (tiposQuery.length > 100 || !/^[\d,]+$/.test(tiposQuery)) {
          console.warn('Formato de tipos en URL inválido')
          return
        }
        
        // Convertir y validar cada tipo
        const tiposArray = tiposQuery
          .split(',')
          .map(tipo => {
            const num = parseInt(tipo, 10)
            // Validar que sea un número positivo y dentro de un rango razonable
            return (!isNaN(num) && num > 0 && num <= 100) ? num : null
          })
          .filter(tipo => tipo !== null)
        
        // Validar que los tipos existan en tiposIncidencias
        const tiposValidos = tiposArray.filter(tipo => 
          tiposIncidencias.value.some(t => t.id === tipo)
        )
        
        if (tiposValidos.length > 0) {
          tipoSeleccionado.value = tiposValidos
        }
      } catch (error) {
        console.error('Error al procesar tipos de URL:', error)
      }
    }

    watch(() => route.query.tipos, () => {
      if (tiposIncidencias.value.length > 0) {
        procesarTiposDeURL()
      }
    })

    const MAX_URL_LENGTH = 100
    const MIN_TIPO_ID = 1
    const MAX_TIPO_ID = 100
    const URL_TIPOS_REGEX = /^[\d,]+$/

    // Añadir la referencia para los enlaces del sidebar
    const sidebarLinks = ref(JSON.parse(import.meta.env.VITE_APP_SIDEBAR_LINKS || '[]'))

    const textoBotonResolver = computed(() => 
      import.meta.env.VITE_TEXTO_BOTON_RESOLVER || 'Resolver'
    )

    const textoEstadoSolucionado = computed(() => 
      import.meta.env.VITE_TEXTO_ESTADO_SOLUCIONADO || 'Solucionada'
    )

    return {
      incidencias,
      ubicacionSeleccionada,
      actualizarLista,
      actualizarUbicacion,
      currentPage,
      totalPages,
      nextPage,
      prevPage,
      reportarIncidencia,
      imageModal,
      openImageModal,
      mensajeExito,
      mostrarFormulario,
      incidenciaCreada,
      totalIncidencias,
      textoTotalIncidencias,
      categoriaSeleccionada,
      incluirSolucionadas,
      obtenerIncidencias,
      abrirDetalleIncidencia,
      abrirDetalleIncidenciaPorId,
      incidenciaSeleccionada,
      mostrarMensajeExito,
      mostrarDetalleIncidencia,
      cerrarDetalleIncidencia,
      theme: computed(() => theme.current.value),
      todasLasIncidencias,
      obtenerTodasLasIncidencias,
      seleccionarEnMapa,
      tipoSeleccionado,
      tiposIncidencias,
      isCategoryRoute,
      obtenerIncidencias,
      scrollToTop,
      mostrarAviso,
      instalarPWA,
      cerrarAviso,
      esIOS,
      mostrarDialogoIOS,
      drawer,
      compartir,
      mostrarRanking,
      abrirRanking,
      datosFormulario,
      actualizarDatosFormulario,
      abrirFormularioIncidencia,
      tieneIncidenciasUsuario,
      abrirTusIncidencias,
      todasLasIncidenciasConSolucionadas,
      incidenciasAntiguas,
      mostrarAvisoIncidenciasAntiguas,
      irACercanas,
      mostrarBanner,
      cerrarBanner,
      totalIncidenciasUsuario,
      incidenciasSolucionadasUsuario,
      obtenerIncidenciasUsuario,
      incidenciasAntiguasUsuario,
      incidenciasConReportesSolucion,
      calcularIncidenciasAntiguasUsuario,
      incidenciasActivas,
      incidenciasSolucionadas,
      totalUsuarios,
      manejarCierreBanner,
      tieneFavoritos,
      filtroEstado,
      cambiarFiltroEstado,
      exportarDatos,
      iniciarImportarDatos,
      confirmarImportarDatos,
      mostrarConfirmacionImportar,
      timeoutSnackbar,
      colorSnackbar,
      posicionSnackbar,
      mostrarSnackbar,
      appName,
      appSubtitle,
      appDescription,
      socialLinks,
      comunidadLink,
      appLogoPath,
      restaurarLogoPorDefecto,
      diasParaConsiderarAntigua,
      seleccionarTodos,
      sidebarLinks,
      textoBotonResolver,
      textoEstadoSolucionado,
    }
  }
}
</script>

<style>
/* Estilos globales para todos los componentes */

.leaflet-control-attribution {
  font-size: 9px !important;
}

/* Estilos para los diálogos en escritorio */
@media (min-width: 960px) {
  .v-dialog.v-dialog--fullscreen {
    max-width: 900px !important;
    margin: 48px auto 0 auto !important;
    height: calc(100vh - 48px) !important;
    border-radius: 8px !important;
  }
  .v-toolbar__content {
    height: 48px !important;
  }
}
</style>

<style scoped>
.titulo {
  font-size: 0.85em !important;
  text-transform: uppercase !important;
  text-shadow: 1px 1px 10px #000 !important;
  line-height: 1.2 !important;
  margin-bottom: 4px !important;
}

.subtitulo {
  font-size: 0.7em !important;
  opacity: 0.8;
  text-transform: uppercase !important;
  background-color: rgb(var(--v-theme-secondary)) !important;
  border-radius: 5px;
  margin: auto;
  padding: 0px 6px;
}

.favicon {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

.mensaje-exito {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #4CAF50;
  color: white;
  padding: 15px 20px;
  border-radius: 5px;
  font-size: 1.1em;
  z-index: 3000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  10%, 90% { opacity: 1; }
}

.filtros {
  margin: 10px 0;
  text-align: center;
}

.filtros label {
  cursor: pointer;
}

.floating-btn {
  position: fixed !important;
  bottom: 50px !important;
  right: 24px !important;
  z-index: 99 !important;
  width: 64px !important;
  height: 64px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  transition: all 0.3s ease !important;
}

.floating-btn:hover {
  transform: scale(1.1) !important;
}

.floating-btn .v-btn__content {
  height: 100% !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 24px !important;
}

/* Estilos adicionales para un aspecto más moderno */
.v-card {
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.v-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
}

.v-toolbar-title {
  letter-spacing: 1px !important;
  text-align: center !important;
  width: 100% !important;
}

.custom-banner {
  background-color: rgb(var(--v-theme-secondary)) !important;
  color: #fff !important;
  font-size: 0.75em;
  font-weight: bold;
}

.v-footer a {
  color: #CCC;
  text-decoration: none;
  font-weight: normal;
  font-size: 0.8em;
}

.v-footer a:hover {
  text-decoration: underline !important;
}

.clickable-header {
  cursor: pointer;
}

.avatar-logo {
  align-items: center;
  display: inline-flex;
  height: 30px !important;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16px;
  margin-right: 20px;
  overflow: hidden;
  width: 30px !important;
}

/* Clase personalizada para centrar el contenido */
.flex-grow-1 {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.v-app-bar-nav-icon {
  margin-left: auto;
}

.v-navigation-drawer {
  width: 250px;
}

.position-relative {
  position: relative;
}

.close-btn {
  position: absolute !important;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.small-switch {
  margin-top: 2px;
  margin-bottom: 2px;
}

.small-switch :deep(.v-switch__track) {
  opacity: 0.5;
}

.small-switch :deep(.v-switch__thumb) {
  transform: scale(0.8);
}

.small-switch :deep(.v-label) {
  font-size: 0.9em;
}

.ios-plus-icon {
  font-weight: bold; 
  font-size: 1rem; 
  border: 1px solid grey; 
  border-radius: 5px; 
  padding: 2px; 
  color: grey;
}

.welcome-banner {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 2rem;
}

.welcome-banner .v-card-text {
  max-width: 100%;
  margin: 0 auto;
}

.welcome-banner h1, .welcome-banner h2 {
  color: rgb(var(--v-theme-secondary)) !important;
}

.welcome-banner .v-icon {
  font-size: 2.5rem;
}

.welcome-banner .text-caption {
  font-size: 0.75rem;
  line-height: 1.2;
}

.numero-incidencias {
  font-weight: bold;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: rgb(var(--v-theme-secondary)) !important;
  background-color: white;
}

.ver-todas-link {
  align-items: center;
  background: rgba(103, 83, 164, 0.08);
  border: 1px solid rgba(103, 83, 164, 0.16);
  border-radius: 999px;
  color: rgb(var(--v-theme-secondary));
  display: inline-flex;
  font-size: 0.95rem;
  font-weight: 700;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  text-decoration: none;
  transition: background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.ver-todas-link:hover {
  background: rgba(103, 83, 164, 0.14);
  border-color: rgba(103, 83, 164, 0.24);
  box-shadow: 0 6px 18px rgba(103, 83, 164, 0.08);
  transform: translateY(-1px);
}

.filtro-categoria-banda {
  background: linear-gradient(180deg, rgba(103, 83, 164, 0.04), rgba(103, 83, 164, 0.08));
  border: 1px solid rgba(103, 83, 164, 0.12);
  border-radius: 20px;
  padding: 18px 20px;
}

.filtro-categoria-contenido {
  align-items: center;
  column-gap: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  row-gap: 12px;
}

.filtro-categoria-copy {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
}

.filtro-categoria-eyebrow {
  color: rgba(44, 35, 71, 0.6);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.filtro-categoria-resumen {
  display: flex;
  flex-wrap: wrap;
  row-gap: 6px;
}

.filtro-categoria-nombre {
  color: rgb(var(--v-theme-secondary));
  font-size: 1.14rem;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .filtro-categoria-banda {
    padding: 16px;
  }

  .filtro-categoria-contenido {
    align-items: flex-start;
    flex-direction: column;
  }

  .filtro-categoria-resumen {
    align-items: flex-start;
    flex-direction: column;
    row-gap: 2px;
  }

  .ver-todas-link {
    width: 100%;
  }
}

.desktop-container {
  max-width: 1200px !important;
  margin: 0 auto !important;
}

/* Ajustes para escritorio */
@media (min-width: 960px) {
  .v-card {
    max-width: 900px;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  
  .banner-incidencias {
    max-width: 900px !important;
  }
  
  .custom-banner {
    max-width: 900px !important;
  }
  
  /* Ajustar el tamaño del mapa en escritorio */
  .mapa-container {
    height: 60vh !important;
  }
  
  /* Ajustar el diálogo de detalles */
  .v-dialog {
    max-width: 800px !important;
  }
  
  /* Ajustar el banner de bienvenida */
  .welcome-banner {
    max-width: 700px !important;
    margin: 0 auto;
  }

  .mapa-wrapper {
    margin: 0 auto;
    border-radius: 8px;
    overflow: hidden;
  }
}

.mapa-wrapper {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.v-select :deep(.v-field__input) {
  padding-top: 32px !important;
  padding-bottom: 12px !important;
  min-height: 35px;
}

.v-select :deep(.v-field__append-inner) {
  padding-top: 5px;
}

/* Ajustar el espacio entre chips */
.v-select :deep(.v-chip) {
  margin: 4px 4px;
}
</style>
