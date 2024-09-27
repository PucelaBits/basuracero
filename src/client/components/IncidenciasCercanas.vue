<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-show="dialogVisible" class="incidencias-cercanas-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left class="mr-2">mdi-map-marker-radius</v-icon>
          Validar cercanas
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text fluid class="pa-0">
        <MapaIncidencias 
          :incidencias="incidencias" 
          :incluirSolucionadas="incluirSolucionadas"
          :ubicacionUsuario="ubicacionUsuario"
          :seguirUsuario="true"
          @solicitar-actualizacion-ubicacion="actualizarUbicacionUsuario"
          @incidencia-seleccionada="abrirDetalleIncidencia"
        />
        
        <v-container fluid class="mt-4">
          <v-row>
            <v-col cols="12">
              <v-alert
                color="light-green-lighten-4"
                icon="mdi-check-circle"
                elevation="2"
                class="info-banner mb-4"
              >
                <div class="d-flex align-center">
                  <span>Ayuda a verificar si las incidencias en tu zona ya están solucionadas</span>
                </div>
              </v-alert>
            </v-col>
          </v-row>
          <v-row dense>
            <v-col v-for="incidencia in incidenciasCercanas" :key="incidencia.id" cols="12" sm="6" md="4" lg="3">
              <v-card @click="abrirDetalleIncidencia(incidencia)" class="ma-2 incidencia-card" height="120">
                <v-row no-gutters>
                  <v-col cols="4">
                    <v-img
                      :src="incidencia.imagen"
                      :alt="incidencia.tipo"
                      height="120"
                      cover
                      @error="handleImageError"
                    >
                    </v-img>
                  </v-col>
                  <v-col cols="8">
                    <v-card-text class="pa-2">
                      <p class="text-caption mb-1" :title="incidencia.tipo">
                        {{ incidencia.tipo.length > 25 ? incidencia.tipo.substring(0, 25) + '...' : incidencia.tipo }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-map-marker</v-icon>
                        {{ incidencia.direccion.length > 25 ? incidencia.direccion.substring(0, 25) + '...' : incidencia.direccion }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-calendar</v-icon>
                        {{ formatDate(incidencia.fecha, true) }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-map-marker-distance</v-icon>
                        {{ incidencia.distancia.toFixed(0) }} m
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import MapaIncidencias from './MapaIncidencias.vue'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'IncidenciasCercanas',
  components: {
    MapaIncidencias
  },
  props: {
    incidencias: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    
    const dialogVisible = ref(false)
    const incluirSolucionadas = ref(false)
    const ubicacionUsuario = ref(null)
    const incidenciasCercanas = ref([])
    const watchId = ref(null)

    const actualizarUbicacionUsuario = () => {
      if ("geolocation" in navigator) {
        watchId.value = navigator.geolocation.watchPosition(
          (position) => {
            ubicacionUsuario.value = {
              latitud: position.coords.latitude,
              longitud: position.coords.longitude
            }
            calcularIncidenciasCercanas()
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message)
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      }
    }

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3 // Radio de la Tierra en metros
      const φ1 = lat1 * Math.PI/180
      const φ2 = lat2 * Math.PI/180
      const Δφ = (lat2-lat1) * Math.PI/180
      const Δλ = (lon2-lon1) * Math.PI/180

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

      return R * c
    }

    const calcularIncidenciasCercanas = () => {
      if (ubicacionUsuario.value) {
        const incidenciasConDistancia = props.incidencias.map(incidencia => ({
          ...incidencia,
          distancia: calcularDistancia(
            ubicacionUsuario.value.latitud,
            ubicacionUsuario.value.longitud,
            incidencia.latitud,
            incidencia.longitud
          )
        }))

        incidenciasCercanas.value = incidenciasConDistancia
          .sort((a, b) => a.distancia - b.distancia)
          .slice(0, 10)
      }
    }

    const abrirDetalleIncidencia = (incidencia) => {
      router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } })
    }

    const cerrar = () => {
      dialogVisible.value = false
      router.push('/')
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
    };

    const handleImageError = (e) => {
      e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    };

    const detenerSeguimiento = () => {
      if (watchId.value !== null) {
        navigator.geolocation.clearWatch(watchId.value)
        watchId.value = null
      }
    }

    onMounted(() => {
      if (route.name === 'IncidenciasCercanas') {
        dialogVisible.value = true
        actualizarUbicacionUsuario()
      }
    })

    onUnmounted(() => {
      detenerSeguimiento()
    })

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'IncidenciasCercanas'
    })

    watch(dialogVisible, (newValue) => {
      if (!newValue && route.name === 'IncidenciasCercanas') {
        router.push('/')
      }
    })

    watch(() => ubicacionUsuario.value, calcularIncidenciasCercanas)

    return {
      dialogVisible,
      incluirSolucionadas,
      ubicacionUsuario,
      incidenciasCercanas,
      actualizarUbicacionUsuario,
      abrirDetalleIncidencia,
      cerrar,
      formatDate,
      handleImageError,
      detenerSeguimiento
    }
  }
}
</script>

<style scoped>
.incidencias-cercanas-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.incidencia-card {
  transition: transform 0.3s;
}

.incidencia-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tipo-chip {
  color: #333;
  background-color: #fff;
  opacity: 1 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.descripcion-truncada {
  height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.text-caption {
  color: #666;
}

.info-banner {
  font-size: smaller;
}

.v-alert__icon {
  margin-top: 8px;
}
</style>