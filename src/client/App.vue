<template>
  <v-app>
    <v-app-bar app :color="theme.colors.primary" dark elevation="4" density="compact" @click="scrollToTop" class="clickable-header">
      <v-container class="d-flex justify-center align-center">
        <v-avatar size="26" rounded="circle" class="mr-auto avatar-logo">
          <img src="/favicon.png" alt="Favicon" class="favicon">
        </v-avatar>
        <v-toolbar-title class="text-h6 font-weight-bold titulo">Basura Cero</v-toolbar-title>
      </v-container>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-0">
        <MapaIncidencias 
          :incidencias="todasLasIncidencias" 
          :incluirSolucionadas="incluirSolucionadas"
          @ubicacion-seleccionada="actualizarUbicacion"
          @abrir-formulario="mostrarFormulario = true"
          @incidencia-seleccionada="abrirDetalleIncidencia"
          :ubicacionSeleccionada="ubicacionSeleccionada"
        />

        <v-card class="text-center custom-banner ma-4">
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-icon>mdi-camera</v-icon>
                <span class="ml-2">Informa de incidencias</span>
              </v-col>
              <v-col cols="12">
                <v-icon>mdi-broom</v-icon>
                <span class="ml-2">Manten tu ciudad limpia</span>
              </v-col>
              <v-col cols="12">
                <v-icon>mdi-check-circle</v-icon>
                <span class="ml-2">Valida las ya solucionadas</span>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        
        <v-card class="ma-4">
          <v-card-text>
            <v-switch
              v-model="incluirSolucionadas"
              label="Ver solucionadas"
              @change="obtenerIncidencias"
            ></v-switch>
            <!--<v-select
                v-model="tipoSeleccionado"
                :items="['Todas', ...tiposIncidencias]"
                item-title="nombre"
                item-value="id"
                label="Filtrar por tipo"
                @input="obtenerIncidencias"
            />-->

            <div class="text-caption text-grey">{{ textoTotalIncidencias }}</div>
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
      @click="mostrarFormulario = true"
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
        @incidencia-creada="incidenciaCreada"
        @seleccionar-en-mapa="seleccionarEnMapa"
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
          <a href="https://github.com/PucelaBits/basuracero" target="_blank" rel="noopener noreferrer">Código</a>
        </v-col>
        <v-col class="text-center" cols="4" sm="auto">
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">Licencia</a>
        </v-col>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import ReportarIncidencia from './components/ReportarIncidencia.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import MapaIncidencias from './components/MapaIncidencias.vue'
import ImageModal from './components/ImageModal.vue'
import DetalleIncidencia from './components/DetalleIncidencia.vue'
// Importar el método para obtener los tipos de incidencias
import { obtenerTiposIncidencias } from './utils/api'

export default {
  name: 'App',
  components: {
    ReportarIncidencia,
    ListaIncidencias,
    MapaIncidencias,
    ImageModal,
    DetalleIncidencia
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
    const tipoSeleccionado = ref(null)
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

    const obtenerIncidencias = async (page = currentPage.value, forzarActualizacion = false) => {
      try {
        const params = {
          page: page,
          limit: itemsPerPage,
          incluirSolucionadas: incluirSolucionadas.value,
          tipo: tipoSeleccionado.value === 'Todas' ? null : tipoSeleccionado.value,
        };
        
        if (forzarActualizacion) {
          params._ = Date.now(); // Añadir timestamp solo cuando sea necesario
        }
        
        const response = await axios.get(`/api/incidencias`, { params });
        incidencias.value = response.data.incidencias;
        currentPage.value = response.data.currentPage;
        totalPages.value = response.data.totalPages;
        totalIncidencias.value = response.data.totalItems;
      } catch (error) {
        console.error('Error al obtener incidencias:', error.response ? error.response.data : error.message);
      }
    };

    const obtenerTodasLasIncidencias = async (forzarActualizacion = false) => {
      try {
        const params = {
          incluirSolucionadas: incluirSolucionadas.value,
        };
        
        if (forzarActualizacion) {
          params._ = Date.now();
        }
        
        const response = await axios.get(`/api/incidencias/todas`, { params });
        todasLasIncidencias.value = response.data.incidencias;
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
          console.log('Se detectaron nuevas actualizaciones');
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

    onMounted(() => {
      obtenerIncidencias();
      obtenerTodasLasIncidencias();
      obtenerTipos();
      
      // Verificar actualizaciones cada 30 segundos
      intervalId = setInterval(verificarActualizaciones, 30000);
    });

    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });

    watch(() => incluirSolucionadas.value, () => {
      obtenerIncidencias()
      obtenerTodasLasIncidencias()
    })

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
      console.log('Ubicación seleccionada:', ubicacion);  // Añade este log
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

    const incidenciaCreada = () => {
      obtenerIncidencias(currentPage.value, true);
      obtenerTodasLasIncidencias(true);
      ultimaActualizacionLocal.value = Date.now(); // Actualizar el timestamp local
      mostrarFormulario.value = false;
      mensajeExito.value = 'Incidencia añadida con éxito';
      mostrarMensajeExito.value = true;
      setTimeout(() => {
        mensajeExito.value = '';
      }, 3000);
    }

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
    }
  }
}
</script>

<style scoped>
.titulo {
  font-size: 0.85em !important;
  text-transform: uppercase !important;
  text-shadow: 1px 1px 10px #000 !important;
  margin-left: -25px;
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
}
</style>