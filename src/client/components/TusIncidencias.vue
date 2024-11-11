<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-if="!cargando" v-show="dialogVisible" class="tus-incidencias-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left size="small" class="mr-2 mb-1">mdi-account-details</v-icon>
          <span>Tus enviados</span>
        </v-toolbar-title>
      </v-toolbar>

      <div class="mapa-container">
        <MapaIncidencias
          v-if="!cargando && incidenciasUsuarioFiltradas.length > 0"
          :key="mapKey"
          :incidencias="incidenciasFiltradas"
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
          <v-row v-else-if="incidenciasUsuarioFiltradas.length === 0">
            <v-col cols="12">
              <v-alert type="info">
                No has enviado nada aún
              </v-alert>
            </v-col>
          </v-row>
          <v-row v-else>
            <!-- Resumen de incidencias -->
            <v-col cols="12" class="text-center mb-4">
              <p class="text-body-2 text-grey">
                <v-icon color="grey" class="mr-1">mdi-file-document-multiple</v-icon>
                <span class="mr-4">{{ incidenciasUsuarioFiltradas.length }}</span>
                <v-icon color="grey" class="mr-1">mdi-check-circle</v-icon>
                <span>{{ incidenciasSolucionadas }}</span>
              </p>
            </v-col>
            <v-row>
            <v-col cols="12">
              <v-alert
                color="secondary"
                icon="mdi-check-circle"
                elevation="2"
                class="info-banner mb-4"
              >
                <div class="d-flex align-center text-body-2">
                  <span>Revisa habitualmente y marca como {{ textoEstadoSolucionado.toLowerCase() }}s los que ya lo estén</span>
                </div>
              </v-alert>
              </v-col>
            </v-row>
            
            <!-- Contenedor para filtros -->
            <v-row class="mb-4">
              <v-col cols="12">
                <div class="d-flex justify-center align-center flex-wrap gap-4">
                  <v-btn-toggle
                    v-model="filtroEstado"
                    mandatory
                    color="primary"
                    rounded="pill"
                    density="compact"
                    class="mb-2"
                  >
                    <v-btn value="todas" size="small">Todos</v-btn>
                    <v-btn value="activas" size="small">Activos</v-btn>
                    <v-btn value="solucionadas" size="small">{{ textoEstadoSolucionado }}s</v-btn>
                  </v-btn-toggle>

                  <v-select
                    v-model="ordenSeleccionado"
                    :items="opcionesOrden"
                    label="Ordenar por"
                    density="compact"
                    variant="outlined"
                    rounded="pill"
                    hide-details
                    class="orden-select"
                  >
                    <template v-slot:prepend-inner>
                      <v-icon size="small" color="primary">mdi-sort</v-icon>
                    </template>
                  </v-select>
                </div>
              </v-col>
            </v-row>
            
            <!-- Lista de incidencias -->
            <v-row v-if="incidenciasFiltradas.length > 0" class="fill-width">
              <v-col 
                v-for="incidencia in incidenciasFiltradas" 
                :key="incidencia.id" 
                cols="12" 
                sm="12" 
                md="6" 
                lg="4"
                class="pa-2"
              >
                <v-card @click="abrirDetalleIncidencia(incidencia)" class="incidencia-card">
                  <v-row no-gutters>
                    <v-col cols="4">
                      <v-img
                        v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
                        :src="incidencia.imagenes[0].ruta_imagen"
                        height="188"
                        cover
                        @error="handleImageError"
                      >
                        <template v-slot:placeholder>
                          <v-row class="fill-height ma-0" align="center" justify="center">
                            <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                          </v-row>
                        </template>
                      </v-img>
                      <div v-else class="no-image-placeholder" height="150">
                        <v-icon>mdi-image-off</v-icon>
                      </div>
                    </v-col>
                    <v-col cols="8">
                      <v-card-text class="pl-2 pb-2 pt-1">
                        <p class="text-caption mb-1" :title="incidencia.tipo">
                          <v-icon x-small class="mr-1">{{ obtenerIconoTipo(incidencia.tipo) }}</v-icon>
                          {{ incidencia.tipo.length > 22 ? incidencia.tipo.substring(0, 22) + '...' : incidencia.tipo }}
                        </p>
                        <p class="text-caption mb-1">
                          <v-icon x-small class="mr-1">mdi-map-marker</v-icon>
                          {{ incidencia.direccion_completa.road }}{{ incidencia.direccion_completa.house_number ? ` ${incidencia.direccion_completa.house_number}` : '' }}
                        </p>
                        <p class="text-caption mb-1">
                          <v-icon x-small class="mr-1">mdi-calendar</v-icon>
                          {{ formatDate(incidencia.fecha) }}
                        </p>
                        <p class="text-caption mb-1">
                          <v-icon x-small class="mr-1" :color="incidencia.estado === 'activa' ? 'error' : 'success'">mdi-circle</v-icon>
                          {{ incidencia.estado === 'activa' ? 'activa' : textoEstadoSolucionado.toLowerCase() }}
                        </p>
                        <p class="text-caption mb-1" v-if="incidencia.reportes_solucion > 0">
                          <v-icon x-small class="mr-1">mdi-account-group</v-icon>
                          {{ incidencia.reportes_solucion }} voto{{ incidencia.reportes_solucion !== 1 ? 's' : '' }} de {{ textoEstadoSolucionado.toLowerCase() }}
                        </p>
                      </v-card-text>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col cols="12">
                <v-alert type="info">
                  No hay ninguna que coincida con el filtro seleccionado
                </v-alert>
              </v-col>
            </v-row>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
    <v-card v-else-if="!cargando && incidenciasUsuarioFiltradas.length === 0" v-show="dialogVisible" class="tus-incidencias-card">
      <v-card-text>
        No tienes ninguna enviada
      </v-card-text>
    </v-card>
    <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
  </v-dialog>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MapaIncidencias from './MapaIncidencias.vue'
import { useIncidenciasUsuarioStore } from '../store/incidenciasUsuarioStore'

const TIPOS_INCIDENCIAS_INICIALES = JSON.parse(import.meta.env.VITE_TIPOS_INCIDENCIAS_INICIALES || '[]')

export default {
  name: 'TusIncidencias',
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
    const { incidenciasUsuario, loadIncidenciasUsuario } = useIncidenciasUsuarioStore()
    const filtroEstado = ref('todas')
    const mapKey = ref(0)
    const ordenSeleccionado = ref('fecha_desc')
    const opcionesOrden = computed(() => [
      { title: 'Más recientes', value: 'fecha_desc' },
      { title: 'Más antiguos', value: 'fecha_asc' },
      { title: `Más votos de ${textoEstadoSolucionado.value.toLowerCase()}s`, value: 'votos_desc' }
    ])
    const incidenciasUsuarioFiltradas = computed(() => {
      return todasLasIncidencias.value.filter(incidencia => 
        incidenciasUsuario.value.includes(incidencia.id)
      )
    })

    const textoBotonResolver = computed(() => 
      import.meta.env.VITE_TEXTO_BOTON_RESOLVER || 'Resolver'
    )

    const textoEstadoSolucionado = computed(() => 
      import.meta.env.VITE_TEXTO_ESTADO_SOLUCIONADO || 'Solucionada'
    )

    const incidenciasSolucionadas = computed(() => {
      return incidenciasUsuarioFiltradas.value.filter(incidencia => 
        incidencia.estado === 'solucionada'
      ).length
    })

    const incidenciasFiltradas = computed(() => {
      let incidencias = [...incidenciasUsuarioFiltradas.value] // Crear una copia para no mutar el original
      
      // Aplicar ordenamiento primero
      switch (ordenSeleccionado.value) {
        case 'fecha_asc':
          incidencias.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          break
        case 'fecha_desc':
          incidencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          break
        case 'votos_desc':
          incidencias.sort((a, b) => (b.reportes_solucion || 0) - (a.reportes_solucion || 0))
          break
      }
      
      // Luego aplicar filtro por estado
      if (filtroEstado.value !== 'todas') {
        incidencias = incidencias.filter(incidencia => 
          incidencia.estado === (filtroEstado.value === 'activas' ? 'activa' : 'solucionada')
        )
      }
      
      return incidencias
    })

    const cerrar = () => {
      if (route.name === 'TusIncidencias') {
        router.push({ name: 'Home' });
      } else {
        dialogVisible.value = false;
      }
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

    const cargarIncidencias = async () => {
      try {
        cargando.value = true
        await loadIncidenciasUsuario()

        const shouldContinueWatching = ref(true)

        await Promise.race([
          new Promise(resolve => {
            watch(() => props.incidencias, (newIncidencias) => {
              if (Array.isArray(newIncidencias) && newIncidencias.length > 0 && shouldContinueWatching.value) {
                todasLasIncidencias.value = newIncidencias
                shouldContinueWatching.value = false
                resolve()
              }
            }, { immediate: true })
          }),
          new Promise((_, reject) => setTimeout(() => {
            shouldContinueWatching.value = false
            reject(new Error('Tiempo de espera agotado'))
          }, 10000))
        ])
      } catch (error) {
        console.error('Error al cargar las incidencias:', error)
        if (error.message === 'Tiempo de espera agotado') {
          console.error('La carga de incidencias ha excedido el tiempo límite')
        } else if (error.name === 'NetworkError') {
          console.error('Error de red al cargar las incidencias')
        } else {
          console.error('Error inesperado:', error.message)
        }
      } finally {
        cargando.value = false
      }
    }

    const obtenerIconoTipo = (tipo) => {
      const tipoInicial = TIPOS_INCIDENCIAS_INICIALES.find(t => t.tipo === tipo)
      return tipoInicial?.icono || 'mdi-tag-outline'
    }

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'TusIncidencias'
      if (dialogVisible.value) {
        cargarIncidencias()
      }
    }, { immediate: true })

    watch(dialogVisible, (newValue) => {
      if (!newValue && route.name === 'TusIncidencias') {
        router.push({ name: 'Home' });
      }
    })

    onMounted(() => {
      if (route.name === 'TusIncidencias') {
        dialogVisible.value = true
        cargarIncidencias()
      }
    })

    return {
      dialogVisible,
      incidenciasUsuarioFiltradas,
      cerrar,
      abrirDetalleIncidencia,
      handleImageError,
      formatDate,
      cargando,
      incidenciasSolucionadas,
      todasLasIncidencias,
      filtroEstado,
      incidenciasFiltradas,
      mapKey,
      ordenSeleccionado,
      opcionesOrden,
      obtenerIconoTipo,
      textoBotonResolver,
      textoEstadoSolucionado,
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
  width: 100%;
  max-width: 600px; /* Limitar el ancho máximo */
  margin: 0 auto; /* Centrar la tarjeta */
  min-height: 150px;
  height: 170px;
}

.incidencia-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.text-caption {
  color: #666;
}

.text-grey {
  color: rgba(0, 0, 0, 0.6);
}

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #999;
  height: 100%;
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

.orden-select {
  max-width: 250px;
  min-width: 200px;
}

.orden-select :deep(.v-field__input) {
  padding-top: 5px;
  padding-bottom: 5px;
  min-height: 35px;
}

.orden-select :deep(.v-field__append-inner) {
  padding-top: 5px;
}

/* Nuevo estilo para el contenedor de filtros */
.gap-4 {
  gap: 1rem;
}

.v-row {
  width: 100%;
  margin: 0;
}

.v-col {
  display: flex;
  justify-content: center;
}
</style>