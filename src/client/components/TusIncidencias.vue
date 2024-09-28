<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-show="dialogVisible" class="tus-incidencias-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left size="small" class="mr-2 mb-1">mdi-account-details</v-icon>
          <span>Tus incidencias</span>
        </v-toolbar-title>
      </v-toolbar>

      <div class="mapa-container">
        <MapaIncidencias
          v-if="!cargando && incidenciasUsuario.length > 0"
          :incidencias="incidenciasUsuario"
          :incluirSolucionadas="true"
          :deshabilitarNuevaIncidencia="true"
          @incidencia-seleccionada="abrirDetalleIncidencia"
        />
      </div>

      <v-card-text>
        <v-container fluid>
          <v-row v-if="cargando">
            <v-col cols="12" class="text-center">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </v-col>
          </v-row>
          <v-row v-else-if="incidenciasUsuario.length === 0">
            <v-col cols="12">
              <v-alert type="info">
                No has reportado ninguna incidencia aún.
              </v-alert>
            </v-col>
          </v-row>
          <v-row v-else>
            <!-- Resumen de incidencias -->
            <v-col cols="12" class="text-center mb-4">
              <p class="text-body-2 text-grey">
                <v-icon color="grey" class="mr-1">mdi-file-document-multiple</v-icon>
                <span class="mr-4">{{ incidenciasUsuario.length }}</span>
                <v-icon color="grey" class="mr-1">mdi-check-circle</v-icon>
                <span>{{ incidenciasSolucionadas }}</span>
              </p>
            </v-col>
            <v-row>
            <v-col cols="12">
              <v-alert
                color="grey-lighten-4"
                icon="mdi-check-circle"
                elevation="2"
                class="info-banner mb-4"
              >
                <div class="d-flex align-center text-body-2">
                  <span>Revisa habitualmente tus incidencias y marca como solucionadas las que ya lo estén</span>
                </div>
              </v-alert>
              </v-col>
            </v-row>
            <!-- Lista de incidencias -->
            <v-col v-for="incidencia in incidenciasUsuario" :key="incidencia.id" cols="12" sm="6" md="4" lg="3">
              <v-card @click="abrirDetalleIncidencia(incidencia)" class="ma-0 incidencia-card" height="150">
                <v-row no-gutters>
                  <v-col cols="4">
                    <v-img
                      :src="incidencia.imagen"
                      :alt="incidencia.tipo"
                      height="150"
                      cover
                      @error="handleImageError"
                    >
                    </v-img>
                  </v-col>
                  <v-col cols="8">
                    <v-card-text class="pl-2 pb-2 pt-1">
                      <p class="text-caption mb-1" :title="incidencia.tipo">
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
                        {{ incidencia.reportes_solucion }} {{ incidencia.reportes_solucion === 1 ? 'persona ha' : 'personas han' }} marcado como solucionada
                      </p>
                    </v-card-text>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MapaIncidencias from './MapaIncidencias.vue'

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

    const incidenciasUsuario = computed(() => {
      const incidenciasIds = Object.keys(localStorage)
        .filter(key => key.startsWith('incidencia_'))
        .map(key => parseInt(key.split('_')[1], 10))
      
      console.log('IDs de incidencias en localStorage:', incidenciasIds)
      console.log('Todas las incidencias:', todasLasIncidencias.value)
      
      const incidenciasFiltradas = todasLasIncidencias.value.filter(incidencia => 
        incidenciasIds.includes(incidencia.id)
      )
      
      console.log('Incidencias filtradas:', incidenciasFiltradas)
      
      return incidenciasFiltradas
    })

    const incidenciasSolucionadas = computed(() => {
      return incidenciasUsuario.value.filter(incidencia => incidencia.estado === 'solucionada').length
    })

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

    const cargarIncidencias = async () => {
      try {
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

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'TusIncidencias'
      if (dialogVisible.value) {
        cargarIncidencias()
      }
    }, { immediate: true })

    watch(dialogVisible, (newValue) => {
      if (!newValue && route.name === 'TusIncidencias') {
        router.push('/')
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
      incidenciasUsuario,
      cerrar,
      abrirDetalleIncidencia,
      handleImageError,
      formatDate,
      cargando,
      incidenciasSolucionadas
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
  transition: transform 0.3s;
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
</style>