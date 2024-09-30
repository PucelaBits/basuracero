<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-if="dialogVisible" class="incidencias-cercanas-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left size="small" class="mr-2 mb-1">mdi-map-marker-radius</v-icon>
          <span>Validar cercanas</span>
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text fluid class="pa-0">
        <MapaIncidencias 
          :incidencias="incidenciasCalculadas" 
          :incluirSolucionadas="incluirSolucionadas"
          :ubicacionUsuario="ubicacionUsuario"
          :seguirUsuario="true"
          :deshabilitarNuevaIncidencia="true"
          :esCercanas="true"
          :zoomForzado="16"
          @solicitar-actualizacion-ubicacion="actualizarUbicacionUsuario"
          @incidencia-seleccionada="abrirDetalleIncidencia"
          @verificar-estado="verificarEstadoIncidencia"
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
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="ordenSeleccionado"
                :items="opcionesOrden"
                label="Ordenar por"
                density="compact"
                variant="outlined"
                class="mb-0"
              ></v-select>
            </v-col>
          </v-row>
          <v-row dense>
            <v-col v-if="cargandoIncidencias" cols="12" class="text-center">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p class="mt-2">Cargando incidencias...</p>
            </v-col>
            <v-col v-else-if="incidenciasCalculadas.length === 0" cols="12" class="text-center">
              <p>No se encontraron incidencias cercanas.</p>
            </v-col>
            <v-col v-else v-for="incidencia in incidenciasOrdenadas" :key="incidencia.id" cols="12" sm="6" md="4" lg="3">
              <v-card @click="abrirDetalleIncidencia(incidencia)" class="ma-2 incidencia-card" height="auto">
                <v-row no-gutters>
                  <v-col cols="4">
                    <v-img
                      v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
                      :src="incidencia.imagenes[0].ruta_imagen"
                      height="120"
                      cover
                      @error="handleImageError"
                    >
                      <template v-slot:placeholder>
                        <v-row class="fill-height ma-0" align="center" justify="center">
                          <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                        </v-row>
                      </template>
                    </v-img>
                    <div v-else class="no-image-placeholder" height="120">
                      <v-icon>mdi-image-off</v-icon>
                    </div>
                  </v-col>
                  <v-col cols="8">
                    <v-card-text class="pa-2">
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
                        {{ formatDate(incidencia.fecha, true) }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-map-marker-distance</v-icon>
                        {{ incidencia.distancia.toFixed(0) }} m
                      </p>
                    </v-card-text>
                  </v-col>
                </v-row>
                <v-divider></v-divider>
                <div v-if="incidencia.faldonOculto !== undefined && !incidencia.faldonOculto" class="popup-verification pa-2">
                  <p class="text-center mb-2">¿Está ya solucionada?</p>
                  <div class="verification-buttons">
                    <v-btn x-small class="verify-btn verify-yes" @click.stop="verificarEstadoIncidencia(incidencia.id, 'solucionada')">
                      <v-icon left x-small>mdi-check</v-icon> Sí
                    </v-btn>
                    <v-btn x-small class="verify-btn verify-no" @click.stop="verificarEstadoIncidencia(incidencia.id, 'activa')">
                      <v-icon left small>mdi-close</v-icon> No
                    </v-btn>
                    <v-btn x-small class="verify-btn verify-unknown" @click.stop="ocultarFaldon(incidencia)">
                      <v-icon left small>mdi-help</v-icon> No sé
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>

    <!-- Diálogo de confirmación para resolver incidencia -->
    <v-dialog v-model="mostrarDialogoConfirmacion" max-width="500px">
      <v-card>
        <v-card-title class="headline">Confirmar resolución</v-card-title>
        <v-card-text>
          ¿Has verificado presencialmente que la incidencia ha sido solucionada?
          <div v-if="captchaHabilitado" ref="captchaContainer" class="frc-captcha" :data-sitekey="friendlyCaptchaSiteKey" data-lang="es"></div>
          <div v-else class="text-caption mt-2">El captcha no está disponible en este momento.</div>
          <div class="subtitle-text">Se guardará una versión anonimizada de tu IP para evitar abusos</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="confirmarSolucion" :disabled="!captchaHabilitado">Sí</v-btn>
          <v-btn color="red darken-1" text @click="cancelarConfirmacion">No</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo para WhatsApp -->
    <v-dialog v-model="mostrarDialogoWhatsApp" max-width="500px">
      <v-card>
        <v-card-title class="headline">
          <v-icon left>mdi-whatsapp</v-icon>
          Informar por WhatsApp
        </v-card-title>
        <v-card-text>
          Cuando pulses aceptar se te redirigirá al bot de WhatsApp del ayuntamiento adjuntando la descripción y la dirección
          <br>
          <br><span class="subtitle-text"><strong>Nota:</strong> Si es la primera vez que hablas con el bot necesitarás mandarle primero "Hola" para activarle</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="handleEnviarWhatsApp">Aceptar</v-btn>
          <v-btn color="error" text @click="mostrarDialogoWhatsApp = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo para mostrar errores -->
    <v-dialog v-model="mostrarDialogoError" max-width="400px">
      <v-card>
        <v-card-title class="headline">Error</v-card-title>
        <v-card-text>
          {{ mensajeError }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mostrarDialogoError = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de advertencia -->
    <v-dialog v-model="mostrarDialogoAdvertencia" max-width="400px">
      <v-card>
        <v-card-title class="headline">Advertencia</v-card-title>
        <v-card-text>
          Sólo puedes marcarla como solucionada si lo has comprobado presencialmente.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mostrarDialogoAdvertencia = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted, nextTick, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MapaIncidencias from './MapaIncidencias.vue'
import { useResolverIncidencia } from '@/composables/useResolverIncidencia'
import { useInformarAyuntamiento } from '@/composables/useInformarAyuntamiento'
import { WidgetInstance } from 'friendly-challenge'

export default {
  name: 'IncidenciasCercanas',
  components: { MapaIncidencias },
  props: {
    incidencias: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    
    const { resolverIncidencia, reportando, mensajeError } = useResolverIncidencia()
    const { enviarWhatsApp } = useInformarAyuntamiento()

    const dialogVisible = ref(false)
    const cargandoUbicacion = ref(false)
    const cargandoIncidencias = ref(true)
    const ubicacionUsuario = ref(null)
    const incidenciasCalculadas = ref([])
    const watchId = ref(null)
    const ordenSeleccionado = ref('distancia')
    const opcionesOrden = [
      { title: 'Más cercanas', value: 'distancia' },
      { title: 'Más antiguas', value: 'antiguedad' }
    ]
    const incluirSolucionadas = ref(false)

    const mostrarDialogoConfirmacion = ref(false)
    const mostrarDialogoWhatsApp = ref(false)
    const mostrarDialogoError = ref(false)
    const mostrarDialogoAdvertencia = ref(false)
    const captchaContainer = ref(null)
    const captchaSolution = ref(null)
    const captchaWidget = ref(null)
    const incidenciaSeleccionada = ref(null)
    const captchaHabilitado = ref(import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED === 'true')

    const friendlyCaptchaSiteKey = import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY

    const actualizarUbicacionUsuario = () => {
      cargandoUbicacion.value = true
      if ("geolocation" in navigator) {
        watchId.value = navigator.geolocation.watchPosition(
          (position) => {
            ubicacionUsuario.value = {
              latitud: position.coords.latitude,
              longitud: position.coords.longitude
            }
            cargandoUbicacion.value = false
            calcularIncidenciasCercanas()
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message)
            cargandoUbicacion.value = false
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      } else {
        cargandoUbicacion.value = false
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
      if (ubicacionUsuario.value && props.incidencias.length > 0) {
        incidenciasCalculadas.value = props.incidencias.map(incidencia => ({
          ...incidencia,
          id: parseInt(incidencia.id, 10),
          distancia: calcularDistancia(
            ubicacionUsuario.value.latitud,
            ubicacionUsuario.value.longitud,
            incidencia.latitud,
            incidencia.longitud
          ),
          faldonOculto: false
        }));
        cargandoIncidencias.value = false;
      }
    }

    const incidenciasOrdenadas = computed(() => {
      if (ordenSeleccionado.value === 'distancia') {
        return [...incidenciasCalculadas.value].sort((a, b) => a.distancia - b.distancia)
      } else {
        return [...incidenciasCalculadas.value].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      }
    })

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

    const ocultarFaldon = (incidencia) => {
      const index = incidenciasCalculadas.value.findIndex(inc => inc.id === incidencia.id);
      if (index !== -1) {
        incidenciasCalculadas.value[index] = reactive({
          ...incidenciasCalculadas.value[index],
          faldonOculto: true
        });
      }
    };

    const verificarEstadoIncidencia = async (incidenciaId, estado) => {
      try {
        const idNumerico = parseInt(incidenciaId, 10)
        incidenciaSeleccionada.value = incidenciasCalculadas.value.find(inc => inc.id === idNumerico);
        if (!incidenciaSeleccionada.value) {
          return
        }

        if (estado === 'activa') {
          mostrarDialogoWhatsApp.value = true;
        } else if (estado === 'solucionada') {
          mostrarDialogoConfirmacion.value = true;
          await nextTick();
          inicializarCaptcha();
        } else {
          ocultarFaldon(incidenciaSeleccionada.value);
        }
      } catch (error) {
        console.error('Error en verificarEstadoIncidencia:', error)
      }
    };

    const inicializarCaptcha = () => {
      if (captchaHabilitado.value && captchaContainer.value) {
        captchaWidget.value = new WidgetInstance(captchaContainer.value, {
          sitekey: friendlyCaptchaSiteKey,
          doneCallback: (solution) => {
            captchaSolution.value = solution;
          },
          errorCallback: (err) => {
            console.error("Error al resolver el Captcha:", err);
          }
        });
      }
    };

    const confirmarSolucion = async () => {
      if (captchaHabilitado.value && !captchaSolution.value) {
        mostrarError('Por favor, completa el captcha.');
        return;
      }

      mostrarDialogoConfirmacion.value = false;
      try {
        const codigoUnico = localStorage.getItem(`incidencia_${incidenciaSeleccionada.value.id}`);
        const resultado = await resolverIncidencia(incidenciaSeleccionada.value.id, captchaSolution.value, codigoUnico);
        
        if (resultado.solucionada) {
          incidenciaSeleccionada.value = {
            ...incidenciaSeleccionada.value,
            estado: 'solucionada',
            fecha_solucion: new Date().toISOString(),
            faldonOculto: true
          };
          actualizarIncidencias();
        } else {
          incidenciaSeleccionada.value.reportes_solucion = resultado.reportes_solucion;
        }
      } catch (error) {
        console.error('Error en confirmarSolucion:', error);
        mostrarError(mensajeError.value);
      } finally {
        if (captchaWidget.value) {
          captchaWidget.value.reset();
        }
        captchaSolution.value = null;
      }
    };

    const actualizarIncidencias = () => {
      incidenciasCalculadas.value = incidenciasCalculadas.value.map(inc => {
        if (inc.id === incidenciaSeleccionada.value.id) {
          return { ...inc, ...incidenciaSeleccionada.value };
        }
        return inc;
      });
    };

    const cancelarConfirmacion = () => {
      mostrarDialogoConfirmacion.value = false;
      mostrarDialogoAdvertencia.value = true;
    };

    const handleEnviarWhatsApp = () => {
      if (incidenciaSeleccionada.value) {
        enviarWhatsApp(incidenciaSeleccionada.value)
      }
      mostrarDialogoWhatsApp.value = false
    }

    const mostrarError = (mensaje) => {
      mensajeError.value = mensaje
      mostrarDialogoError.value = true
    }

    watch(mostrarDialogoConfirmacion, async (newValue) => {
      if (newValue && captchaHabilitado.value) {
        await nextTick()
        if (captchaContainer.value) {
          captchaWidget.value = new WidgetInstance(captchaContainer.value, {
            sitekey: friendlyCaptchaSiteKey,
            doneCallback: (solution) => {
              captchaSolution.value = solution
            },
            errorCallback: (err) => {
              console.error("Error al resolver el Captcha:", err)
            }
          })
        }
      }
    })

    onMounted(() => {
      if (route.name === 'IncidenciasCercanas') {
        dialogVisible.value = true
        actualizarUbicacionUsuario()
      }
    })

    watch(() => props.incidencias, (newIncidencias) => {
      if (newIncidencias.length > 0) {
        calcularIncidenciasCercanas();
      }
    }, { immediate: true });

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'IncidenciasCercanas'
      if (dialogVisible.value) {
        cargandoIncidencias.value = true
        actualizarUbicacionUsuario()
      }
    })

    watch(dialogVisible, (newValue) => {
      if (newValue) {
        actualizarUbicacionUsuario()
      }
    })

    onUnmounted(() => {
      if (watchId.value !== null) {
        navigator.geolocation.clearWatch(watchId.value)
      }
    })

    return {
      dialogVisible,
      cargandoUbicacion,
      cargandoIncidencias,
      ubicacionUsuario,
      incidenciasCalculadas,
      incidenciasOrdenadas,
      incluirSolucionadas,
      ordenSeleccionado,
      opcionesOrden,
      actualizarUbicacionUsuario,
      abrirDetalleIncidencia,
      cerrar,
      formatDate,
      handleImageError,
      detenerSeguimiento,
      verificarEstadoIncidencia,
      reportando,
      mensajeError,
      mostrarDialogoConfirmacion,
      mostrarDialogoWhatsApp,
      mostrarDialogoError,
      mostrarDialogoAdvertencia,
      captchaContainer,
      captchaSolution,
      captchaWidget,
      incidenciaSeleccionada,
      friendlyCaptchaSiteKey,
      confirmarSolucion,
      cancelarConfirmacion,
      handleEnviarWhatsApp,
      captchaHabilitado,
      ocultarFaldon,
      mostrarError
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
  transition: transform 0.3s, box-shadow 0.3s;
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

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #999;
  height: 100%;
}

.popup-verification {
  background-color: #f0f0f0;
  border-top: 1px solid #ddd;
  padding: 4px 8px;
}

.popup-verification p {
  margin: 0 0 4px 0;
  font-weight: bold;
  font-size: 0.8rem;
}

.verification-buttons {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.verify-btn {
  flex: 1;
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.3s;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.verify-btn .v-icon {
  margin-right: 2px;
  font-size: 0.8rem;
}

.verify-yes {
  background-color: #4caf4f86 !important;
}

.verify-no {
  background-color: #c4807c86 !important;
}

.verify-unknown {
  background-color: #9e9e9e82 !important;
}

.verify-btn:hover {
  opacity: 0.8;
}

.subtitle-text {
  color: grey;
  font-size: smaller;
}

.frc-captcha {
  margin: 0.5em auto;
}

</style>