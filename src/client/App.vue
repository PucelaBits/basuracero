<template>
  <v-app>
    <v-app-bar app :color="theme.colors.primary" dark elevation="4" density="compact" @click="scrollToTop" class="clickable-header">
      <v-container class="d-flex align-center pa-0">
        <v-avatar size="26" rounded="circle" class="avatar-logo">
          <img :src="appLogoPath" alt="Favicon" class="favicon">
        </v-avatar>
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
          <v-list-item-title>Tus incidencias</v-list-item-title>
        </v-list-item>
        <v-list-item to="/favoritas" v-if="tieneFavoritos">
          <template v-slot:prepend>
            <v-icon>mdi-star</v-icon>
          </template>
          <v-list-item-title>Tus favoritas</v-list-item-title>
        </v-list-item>
        <v-list-item to="/cercanas">
          <template v-slot:prepend>
            <v-icon>mdi-map-marker-radius</v-icon>
          </template>
          <v-list-item-title>Validar cercanas</v-list-item-title>
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
            <h3 class="mb-2">Tus incidencias</h3>
            <div class="d-flex justify-space-between align-center mb-2" v-if="incidenciasAntiguasUsuario > 0">
              <div class="d-flex align-center">
                <v-icon color="white" size="small" class="mr-2">mdi-clock-alert</v-icon>
                <span>Más antigua{{ incidenciasAntiguasUsuario !== 1 ? 's' : '' }} de 7 días</span>
              </div>
              <span class="numero-incidencias ml-2">{{ incidenciasAntiguasUsuario }}</span>
            </div>
            <div class="d-flex justify-space-between align-center" v-if="incidenciasConReportesSolucion > 0">
              <div class="d-flex align-center">
                <v-icon color="white" size="small" class="mr-2">mdi-check-circle-outline</v-icon>
                <span>Con votos de solucionada{{ incidenciasConReportesSolucion !== 1 ? 's' : '' }}</span>
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
                  <div class="text-caption">Detecta el problema</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-plus-circle</v-icon>
                  <div class="text-caption">Crea una incidencia</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-check-circle</v-icon>
                  <div class="text-caption">Verifica solucionadas</div>
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

            <v-select
              v-model="tipoSeleccionado"
              :items="tiposIncidencias"
              item-title="nombre"
              item-value="id"
              label="Filtrar por tipo"
              @update:model-value="obtenerIncidencias"
            >
              <template v-slot:prepend-item>
                <v-list-item title="Todas" value="Todas" @click="tipoSeleccionado = 'Todas'"></v-list-item>
                <v-divider class="mt-2"></v-divider>
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
                    <span class="text-caption">Hay <strong>{{ incidenciasAntiguas }}</strong> incidencias activas<br />con más de una semana</span>
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
          :incidencias="incidencias" 
          @incidencia-seleccionada="abrirDetalleIncidencia"
        />
        
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          @update:model-value="(page) => obtenerIncidencias(page)"
          class="my-4"
        ></v-pagination>
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
    <IncidenciasCercanas :incidencias="todasLasIncidencias" />
    <TusIncidencias :incidencias="todasLasIncidenciasConSolucionadas" />
    <RankingBarrios />
    <FavoritasIncidencias :incidencias="todasLasIncidenciasConSolucionadas" />

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
import { useTheme } from 'vuetify'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import ReportarIncidencia from './components/ReportarIncidencia.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import MapaIncidencias from './components/MapaIncidencias.vue'
import ImageModal from './components/ImageModal.vue'
import DetalleIncidencia from './components/DetalleIncidencia.vue'
import RankingUsuarios from './components/RankingUsuarios.vue'
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

export default {
  name: 'App',
  components: {
    ReportarIncidencia,
    ListaIncidencias,
    MapaIncidencias,
    ImageModal,
    DetalleIncidencia,
    RankingUsuarios,
    IncidenciasCercanas,
    TusIncidencias,
    RankingBarrios,
    FavoritasIncidencias,
    MaratonGuide
  },
  setup() {
    const incidencias = ref([])
    const todasLasIncidencias = ref([])
    const ubicacionSeleccionada = ref({})
    const currentPage = ref(1)
    const totalPages = ref(1)
    const itemsPerPage = 10
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
    const tipoSeleccionado = ref('Todas')
    const tiposIncidencias = ref([])

    const textoTotalIncidencias = computed(() => {
      if (incluirSolucionadas.value) {
        return `${totalIncidencias.value} incidencias reportadas`
      } else {
        return `${totalIncidencias.value} incidencias abiertas`
      }
    })

    const obtenerTipos = async () => {
      try {
        const response = await obtenerTiposIncidencias()
        tiposIncidencias.value = response.data
      } catch (error) {
        console.error('Error al obtener tipos de incidencias:', error)
      }
    }

    const cargaInicial = ref(true);

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
          tipo: tipoSeleccionado.value === 'Todas' ? null : tipoSeleccionado.value,
        };
        
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
          tipo: tipoSeleccionado.value === 'Todas' ? null : tipoSeleccionado.value,
        };
        
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
        title: import.meta.env.VITE_APP_NAME,
        text: import.meta.env.VITE_APP_DESCRIPTION,
        url: window.location.href
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

    const calcularIncidenciasAntiguasUsuario = () => {
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - 7);
      
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

    onMounted(() => {
      obtenerIncidencias(1, true);
      obtenerTodasLasIncidencias(true);
      obtenerTipos();
      
      // Verificar actualizaciones cada 30 segundos
      intervalId = setInterval(verificarActualizaciones, 30000);

      detectarIOS();
      window.addEventListener('beforeinstallprompt', manejarEventoInstalacion);

      const bannerVisto = localStorage.getItem('bannerBienvenidaVisto')
      if (bannerVisto === 'true') {
        mostrarBanner.value = false
      }

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
      if (newId) {
        abrirDetalleIncidenciaPorId(newId)
      }
    })

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

      if (previousRoute && ['IncidenciasCercanas', 'TusIncidencias', 'FavoritasIncidencias'].includes(router.resolve(previousRoute).name)) {
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
      unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);
      
      return todasLasIncidencias.value.filter(incidencia => 
        incidencia.estado === 'activa' && new Date(incidencia.fecha) < unaSemanaAtras
      ).length;
    });

    const mostrarAvisoIncidenciasAntiguas = ref(true);

    const irACercanas = () => {
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

    const socialLinks = ref(JSON.parse(import.meta.env.VITE_APP_SOCIAL_LINKS || '[]'))

    // Encontrar el enlace de comunidad si existe
    const comunidadLink = computed(() => 
      socialLinks.value.find(link => link.name.toLowerCase() === 'comunidad')
    )

    const appLogoPath = ref(import.meta.env.VITE_APP_LOGO_PATH || '/img/default/logo.png')

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
  width: 100% !important; 
  height: auto !important;
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
  height: 25px !important;
  flex-shrink: 0;
  margin-right: 26px; /* Añade margen derecho igual al ancho del avatar */
  margin-left: 15px;
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
</style>