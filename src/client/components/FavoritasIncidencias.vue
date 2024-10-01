<template>
    <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
      <v-card v-if="!cargando" v-show="dialogVisible" class="favoritas-incidencias-card">
        <v-toolbar color="primary" class="elevation-2">
          <v-btn icon @click="cerrar">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title class="d-flex align-center">
            <v-icon left size="small" class="mr-2 mb-1">mdi-star</v-icon>
            <span>Tus favoritas</span>
          </v-toolbar-title>
        </v-toolbar>
  
        <div class="mapa-container">
          <MapaIncidencias
            v-if="!cargando && incidenciasFavoritas.length > 0"
            :incidencias="incidenciasFavoritas"
            :incluirSolucionadas="true"
            :deshabilitarNuevaIncidencia="true"
            @incidencia-seleccionada="abrirDetalleIncidencia"
          />
        </div>
  
        <v-card-text class="px-0">
          <v-container fluid>
            <v-row v-if="cargando">
              <v-col cols="12" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </v-col>
            </v-row>
            <v-row v-else-if="incidenciasFavoritas.length === 0">
              <v-col cols="12">
                <v-alert>
                  No tienes incidencias favoritas.
                </v-alert>
              </v-col>
            </v-row>
            <v-row v-else>
              <!-- Resumen de incidencias favoritas -->
              <v-col cols="12" class="text-center mb-4">
                <p class="text-body-2 text-grey">
                  <v-icon color="grey" class="mr-1">mdi-star</v-icon>
                  <span class="mr-4">{{ incidenciasFavoritas.length }}</span>
                  <v-icon color="grey" class="mr-1">mdi-check-circle</v-icon>
                  <span>{{ incidenciasSolucionadas }}</span>
                </p>
              </v-col>
              <!-- Nuevo filtro -->
              <v-row class="mb-4">
                <v-col cols="12" class="d-flex justify-center">
                  <v-btn-toggle
                    v-model="filtroEstado"
                    mandatory
                    color="primary"
                    rounded="pill"
                    density="compact"
                  >
                    <v-btn value="todas" size="small">Todas</v-btn>
                    <v-btn value="activas" size="small">Activas</v-btn>
                    <v-btn value="solucionadas" size="small">Solucionadas</v-btn>
                  </v-btn-toggle>
                </v-col>
              </v-row>
              <!-- Lista de incidencias favoritas -->
              <v-row v-if="incidenciasFiltradas.length > 0">
                <v-col v-for="incidencia in incidenciasFiltradas" :key="incidencia.id" cols="12" sm="6" md="4" lg="3">
                  <v-card class="ma-2 incidencia-card">
                    <div class="card-content" @click="abrirDetalleIncidencia(incidencia)">
                      <v-row no-gutters>
                        <v-col cols="4">
                          <v-img
                            v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
                            :src="incidencia.imagenes[0].ruta_imagen"
                            height="160"
                            cover
                            @error="handleImageError"
                          >
                            <template v-slot:placeholder>
                              <v-row class="fill-height ma-0" align="center" justify="center">
                                <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                              </v-row>
                            </template>
                          </v-img>
                          <div v-else class="no-image-placeholder">
                            <v-icon>mdi-image-off</v-icon>
                          </div>
                        </v-col>
                        <v-col cols="8">
                          <v-card-text class="pl-2 pb-2 pt-1">
                            <p class="text-caption mb-1" :title="incidencia.tipo">
                              <v-icon x-small class="mr-1">mdi-tag-outline</v-icon>
                              {{ incidencia.tipo.length > 22 ? incidencia.tipo.substring(0, 22) + '...' : incidencia.tipo }}
                            </p>
                            <p class="text-caption mb-1">
                              <v-icon x-small class="mr-1">mdi-map-marker</v-icon>
                              {{ incidencia.direccion.length > 20 ? incidencia.direccion.substring(0, 20) + '...' : incidencia.direccion }}
                            </p>
                            <p class="text-caption mb-1">
                              <v-icon x-small class="mr-1">mdi-calendar</v-icon>
                              {{ formatDate(incidencia.fecha) }}
                            </p>
                            <p class="text-caption mb-1">
                              <v-icon x-small class="mr-1" :color="incidencia.estado === 'activa' ? 'error' : 'success'">mdi-circle</v-icon>
                              {{ incidencia.estado }}
                            </p>
                            <p class="text-caption mb-1" v-if="incidencia.reportes_solucion > 0">
                              <v-icon x-small class="mr-1">mdi-account-group</v-icon>
                              {{ incidencia.reportes_solucion }} marcaron como solucionada
                            </p>
                          </v-card-text>
                        </v-col>
                      </v-row>
                    </div>
                    <v-btn
                      block
                      color="white"
                      class="quitar-favoritos-btn"
                      @click.stop="quitarDeFavoritos(incidencia)"
                    >
                      <v-icon>mdi-star</v-icon> Quitar de favoritos
                    </v-btn>
                  </v-card>
                </v-col>
              </v-row>
              <v-row v-else>
                <v-col cols="12">
                  <v-alert color="grey-lighten-4">
                    No hay incidencias favoritas que coincidan con el filtro seleccionado.
                  </v-alert>
                </v-col>
              </v-row>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>
      <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
    </v-dialog>
    <v-snackbar
      v-model="snackbar.show"
      :timeout="2000"
      color="success"
      bottom
    >
      {{ snackbar.text }}
    </v-snackbar>
  </template>
  
  <script>
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import MapaIncidencias from './MapaIncidencias.vue'
  import { useFavoritosStore } from '../store/favoritosStore'
  
  export default {
    name: 'FavoritasIncidencias',
    components: {
      MapaIncidencias
    },
    props: {
      incidencias: {
        type: [Array, Promise],
        required: true
      }
    },
    setup(props) {
      const dialogVisible = ref(false)
      const router = useRouter()
      const route = useRoute()
      const cargando = ref(true)
      const todasLasIncidencias = ref([])
      const { favoritos, quitarFavorito, loadFavoritos } = useFavoritosStore()
      const snackbar = ref({
        show: false,
        text: ''
      })
      const filtroEstado = ref('todas')
  
      const incidenciasFavoritas = computed(() => {
        return todasLasIncidencias.value.filter(incidencia => favoritos.value.includes(incidencia.id))
      })
  
      const incidenciasSolucionadas = computed(() => {
        return incidenciasFavoritas.value.filter(incidencia => incidencia.estado === 'solucionada').length
      })
  
      const incidenciasFiltradas = computed(() => {
        if (filtroEstado.value === 'todas') {
          return incidenciasFavoritas.value
        } else {
          return incidenciasFavoritas.value.filter(incidencia => 
            incidencia.estado === (filtroEstado.value === 'activas' ? 'activa' : 'solucionada')
          )
        }
      })
  
      const cargarIncidencias = async () => {
        try {
          cargando.value = true
          await loadFavoritos()
          if (props.incidencias instanceof Promise) {
            todasLasIncidencias.value = await props.incidencias
          } else {
            todasLasIncidencias.value = props.incidencias
          }
        } catch (error) {
          console.error('Error al cargar las incidencias:', error)
        } finally {
          cargando.value = false
        }
      }
  
      const cerrar = () => {
        dialogVisible.value = false
        router.push('/')
      }
  
      const abrirDetalleIncidencia = (incidencia) => {
        router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } })
      }
  
      const handleImageError = (e) => {
        e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      };
  
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('es-ES', options).replace(',', '');
      }
  
      const quitarDeFavoritos = (incidencia) => {
        quitarFavorito(incidencia.id)
      }
  
      watch(() => props.incidencias, async (newIncidencias) => {
        if (newIncidencias instanceof Promise) {
          todasLasIncidencias.value = await newIncidencias
        } else {
          todasLasIncidencias.value = newIncidencias
        }
      }, { immediate: true })
  
      watch(() => route.name, (newRouteName) => {
        dialogVisible.value = newRouteName === 'FavoritasIncidencias'
        if (dialogVisible.value) {
          cargarIncidencias()
        }
      }, { immediate: true })
  
      watch(dialogVisible, (newValue) => {
        if (!newValue && route.name === 'FavoritasIncidencias') {
          router.push('/')
        }
      })
  
      onMounted(() => {
        if (route.name === 'FavoritasIncidencias') {
          dialogVisible.value = true
          cargarIncidencias()
        }
      })
  
      return {
        dialogVisible,
        incidenciasFavoritas,
        cerrar,
        abrirDetalleIncidencia,
        handleImageError,
        formatDate,
        cargando,
        incidenciasSolucionadas,
        quitarDeFavoritos,
        snackbar,
        filtroEstado,
        incidenciasFiltradas,
      }
    }
  }
  </script>
  
  <style scoped>
  .tus-incidencias-card {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .mapa-container {
    width: 100%;
    height: 50vh; /* Ajusta esta altura según tus necesidades */
  }
  
  .incidencia-card {
    display: flex;
    flex-direction: column;
    height: 196px; /* 160px para el contenido + 36px para el botón */
  }
  
  .card-content {
    flex-grow: 1;
    overflow: hidden;
  }
  
  .quitar-favoritos-btn {
    flex-shrink: 0;
    height: 36px;
  }
  
  .no-image-placeholder {
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
  }
  
  /* Asegurarse de que el contenido de la tarjeta no se superponga con el faldón */
  .v-card__text {
    padding-bottom: 8px !important;
  }
  
  .v-btn-toggle {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .v-btn {
    text-transform: none !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    letter-spacing: 0.0178571429em !important;
  }
  </style>