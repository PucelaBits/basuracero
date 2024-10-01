<template>
  <v-app>
    <v-app-bar app :color="theme.colors.primary" dark elevation="4" density="compact" @click="scrollToTop" class="clickable-header">
      <v-container class="d-flex align-center pa-0">
        <v-avatar size="26" rounded="circle" class="avatar-logo">
          <img src="/logo.png" alt="Favicon" class="favicon">
        </v-avatar>
        <div class="flex-grow-1 text-center">
          <v-toolbar-title class="text-h6 font-weight-bold titulo">Basura Cero</v-toolbar-title>
          <span class="subtitulo text-caption d-block">Pucela</span>
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
          <v-list-item-title>Ranking de barrios</v-list-item-title>
        </v-list-item>
        <v-list-item href="https://t.me/basuraceroapp" target="_blank">
          <template v-slot:prepend>
            <v-icon>mdi-account-group</v-icon>
          </template>
          <v-list-item-title>Comunidad</v-list-item-title>
        </v-list-item>
        <v-list-item @click="compartir">
          <template v-slot:prepend>
            <v-icon>mdi-share-variant</v-icon>
          </template>
          <v-list-item-title>Compartir</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-0">
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

        <!-- Banner de notificación -->
        <v-alert
          v-if="incidenciasAntiguasUsuario > 0"
          color="#7361a0"
          class="banner-incidencias mx-0 pt-4 pb-4 text-center text-caption"
          density="compact"
          text-align="center"
          style="border-radius: 0;"
        >
          <div><v-icon color="white" size="small" class="mr-2">mdi-clock-alert</v-icon>Tienes {{ incidenciasAntiguasUsuario }} incidencia{{ incidenciasAntiguasUsuario !== 1 ? 's' : '' }} más antigua{{ incidenciasAntiguasUsuario !== 1 ? 's' : '' }} de 7 días</div>
          <v-btn text color="white" size="small" class="mt-3" @click="$router.push('/perfil')">
            <v-icon color="grey-darken-2 mr-2">mdi-check-circle</v-icon> Verifica si se {{ incidenciasAntiguasUsuario !== 1 ? 'solucionaron' : 'solucionó' }}
          </v-btn>
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
                <img src="/logo.png" alt="Logo Basura Cero" style="width: 70px; height: 70px;">
              </v-avatar>
              
              <h1 class="text-h5 font-weight-bold mb-4">Bienvenido a Basura Cero</h1>
              
              <p class="text-body-2 mb-6">
                Proyecto colaborativo para visibilizar incidencias no solucionadas en nuestra ciudad
              </p>
              
              <h2 class="text-subtitle-1 font-weight-medium mb-4">¿Cómo ayudar?</h2>
              
              <v-row justify="center" class="mb-6">
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-eye</v-icon>
                  <div class="text-caption">Detecta el problema</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <v-icon size="large" color="primary" class="mb-2">mdi-camera</v-icon>
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
                  <v-icon class="mr-2">mdi-cellphone</v-icon> Añademe a tu pantalla principal
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
        <v-card v-if="incidenciasAntiguas > 0 && mostrarAvisoIncidenciasAntiguas" class="ma-4 custom-banner" color="#7361a0">
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
      <v-icon>mdi-plus</v-icon>
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

    <v-snackbar v-model="mostrarMensajeExito" :timeout="3000" color="success">
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
        <v-col class="text-center" cols="4" sm="auto">
          <a href="https://t.me/basuraceroapp" target="_blank" rel="noopener noreferrer">Contacto</a>
        </v-col>
        <v-col class="text-center" cols="4" sm="auto">
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">Licencia</a>
        </v-col>
        <v-col class="text-center" cols="4" sm="auto">
          <a href="https://github.com/PucelaBits/basuracero" target="_blank" rel="noopener noreferrer">Código</a>
        </v-col>
      </v-row>
    </v-footer>

    <!-- Diálogo para iOS -->
    <v-dialog v-model="mostrarDialogoIOS" max-width="400">
      <v-card>
        <v-card-title class="headline">
          <v-icon>mdi-cellphone</v-icon> Cómo añadir en iOS
        </v-card-title>
        <v-card-text>
          Para añadir la aplicación en tu dispositivo iOS:
          <br>
          <br>
          <v-icon>mdi-share</v-icon> Toca el icono de compartir en Safari
          <br>
          <v-icon>mdi-plus</v-icon> Desplázate y selecciona "Añadir a la pantalla de inicio"
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
    FavoritasIncidencias
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
        
        incidencias.value = response.data.incidencias;
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
        console.error('Error al obtener incidencias:', error.response ? error.response.data : error.message);
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
        todasLasIncidencias.value = response.data.incidencias;
        todasLasIncidenciasConSolucionadas.value = response.data.incidencias;
        
        // Actualizar estadísticas aquí
        actualizarEstadisticas(response.data.incidencias);
      } catch (error) {
        console.error('Error al obtener todas las incidencias:', error.response ? error.response.data : error.message);
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

    const compartir = () => {
      if (navigator.share) {
        navigator.share({
          title: 'Basura Cero Pucela',
          text: 'Ayuda a mantener limpia tu ciudad con Basura Cero Pucela',
          url: window.location.href,
        })
        .then(() => {
          console.log('Contenido compartido exitosamente');
          enviarEventoMatomo('Incidencia', 'Compartir', 'Éxito');
        })
        .catch((error) => console.log('Error al compartir:', error));
      } else {
        alert('La API de compartir no está disponible en este dispositivo');
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

    const calcularIncidenciasAntiguasUsuario = () => {
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - 7);
      
      const incidenciasIds = incidenciasUsuario.value.map(id => id.toString());

      incidenciasAntiguasUsuario.value = todasLasIncidencias.value.filter(incidencia => 
        incidenciasIds.includes(incidencia.id.toString()) &&
        incidencia.estado === 'activa' &&
        new Date(incidencia.fecha) < diasAtras
      ).length;
    };

    // Actualizar cuando cambien las incidencias
    watch(todasLasIncidencias, calcularIncidenciasAntiguasUsuario);

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
      incidenciaSeleccionada.value = null;
      mostrarDetalleIncidencia.value = false;
    }

    const seleccionarEnMapa = () => {
      mostrarFormulario.value = false
    }

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
      incidenciasActivas,
      incidenciasSolucionadas,
      totalUsuarios,
      manejarCierreBanner,
      tieneFavoritos,
      filtroEstado,
      cambiarFiltroEstado,
    }
  }
}
</script>

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
  background-color: #7361a0;
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
  bottom: 24px !important;
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
  background-color: #7361a0;
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
  color: #7361a0;
}

.welcome-banner .v-icon {
  font-size: 2.5rem;
}

.welcome-banner .text-caption {
  font-size: 0.75rem;
  line-height: 1.2;
}
</style>