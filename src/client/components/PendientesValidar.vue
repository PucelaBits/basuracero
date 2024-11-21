<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-if="!cargando" v-show="dialogVisible" class="pendientes-validar-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left size="small" class="mr-2 mb-1">mdi-eye-check</v-icon>
          <span>Validar pendientes</span>
        </v-toolbar-title>
      </v-toolbar>

      <div class="mapa-container">
        <MapaIncidencias
          v-if="!cargando && incidenciasFiltradas.length > 0"
          :incidencias="incidenciasFiltradas"
          :incluirSolucionadas="false"
          :deshabilitarNuevaIncidencia="true"
          @incidencia-seleccionada="abrirDetalleIncidencia"
        />
      </div>

      <v-card-text class="px-0">
        <v-container fluid>
          <!-- Resumen de incidencias -->
          <v-row>
            <v-col cols="12">
              <v-alert
                color="secondary"
                icon="mdi-check-circle"
                elevation="2"
                class="info-banner mb-4"
              >
                <div class="d-flex align-center text-body-2">
                  <span>Hay {{ incidenciasFiltradas.length }} puntos con votos de {{ textoEstadoSolucionado.toLowerCase() }} pendientes de validar</span>
                </div>
              </v-alert>
            </v-col>
          </v-row>
          
          <!-- Contenedor para filtros -->
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex justify-center align-center flex-wrap gap-4">
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
                    <v-card-text class="pl-2 pb-2 pt-1">
                      <p class="text-caption mb-1" :title="incidencia.tipo">
                        <v-icon x-small class="mr-1">{{ obtenerIconoTipo(incidencia.tipo) }}</v-icon>
                        {{ incidencia.tipo.length > 22 ? incidencia.tipo.substring(0, 22) + '...' : incidencia.tipo }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-map-marker</v-icon>
                        {{ incidencia.direccion_completa.road || incidencia.direccion_completa.neighbourhood || incidencia.direccion_completa.suburb }}{{ incidencia.direccion_completa.house_number ? ` ${incidencia.direccion_completa.house_number}` : '' }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-calendar</v-icon>
                        {{ formatDate(incidencia.fecha) }}
                      </p>
                      <p class="text-caption mb-1">
                        <v-icon x-small class="mr-1">mdi-account-group</v-icon>
                        {{ incidencia.reportes_solucion }} voto{{ incidencia.reportes_solucion !== 1 ? 's' : '' }} de solución
                      </p>
                    </v-card-text>
                  </v-col>
                </v-row>
                <v-divider></v-divider>
                <div 
                  v-if="mostrarFaldon(incidencia)" 
                  class="popup-verification pa-2"
                >
                  <p class="text-center mb-2">¿Está {{ textoEstadoSolucionado.toLowerCase() }}?</p>
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
  </v-dialog>

  <!-- Diálogo de confirmación para resolver incidencia -->
  <v-dialog v-model="mostrarDialogoConfirmacion" max-width="500px">
    <v-card>
      <v-card-title class="headline">Confirmar</v-card-title>
      <v-card-text>
        ¿Has verificado presencialmente que ha sido solucionada?
        <v-text-field
          v-model="nombreUsuario"
          label="Tu nombre o apodo"
          :rules="[v => !!v || 'El nombre o apodo es necesario']"
          required
          class="mt-4"
        ></v-text-field>
        <div v-if="captchaHabilitado" ref="captchaContainer" class="frc-captcha mt-0" :data-sitekey="friendlyCaptchaSiteKey" data-lang="es"></div>
        <div v-else class="text-caption mt-2">El captcha no está disponible en este momento.</div>
        <div class="subtitle-text">Se guardará una versión anonimizada de tu IP para evitar abusos</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" text @click="confirmarSolucion" :disabled="!captchaHabilitado || !nombreUsuario">Sí</v-btn>
        <v-btn color="red darken-1" text @click="cancelarConfirmacion">No</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog 
    v-if="whatsAppShare.isEnabled.value"
    v-model="mostrarDialogoWhatsApp" 
    max-width="500px"
  >
    <v-card>
      <v-card-title class="headline">
        <v-icon left>mdi-whatsapp</v-icon>
        {{ whatsAppShare.dialogTitle }}
      </v-card-title>
      <v-card-text>
        {{ whatsAppShare.dialogText }}
        <br>
        <br><span class="subtitle-text"><strong>Nota:</strong> {{ whatsAppShare.dialogNote }}</span>
        <v-checkbox
          v-model="añadirAFavoritas"
          label="Añadir a mis favoritas"
          class="mt-2 mb-4"
          :value="true"
        ></v-checkbox>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" text @click="enviarWhatsAppYFavoritos">Aceptar</v-btn>
        <v-btn color="error" text @click="mostrarDialogoWhatsApp = false">Cancelar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="mostrarDialogoError" max-width="400px">
    <v-card>
      <v-card-title class="headline">Error</v-card-title>
      <v-card-text>
        {{ mensajeError }}
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" text @click="mostrarDialogoError = false">Aceptar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="mostrarDialogoAdvertencia" max-width="400px">
    <v-card>
      <v-card-title class="headline">Advertencia</v-card-title>
      <v-card-text>
        Sólo puedes marcarlo como {{ textoEstadoSolucionado.toLowerCase() }} si lo has comprobado presencialmente.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="mostrarDialogoAdvertencia = false">
          Entendido
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="snackbar"
    :timeout="2000"
    color="success"
    bottom
  >
    {{ snackbarText }}
  </v-snackbar>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MapaIncidencias from './MapaIncidencias.vue'
import { useResolverIncidencia } from '@/composables/useResolverIncidencia'
import { useWhatsAppShare } from '@/composables/useWhatsAppShare'
import { useFavoritosStore } from '@/store/favoritosStore'
import { WidgetInstance } from 'friendly-challenge'
const TIPOS_INCIDENCIAS_INICIALES = JSON.parse(import.meta.env.VITE_TIPOS_INCIDENCIAS_INICIALES || '[]')

const router = useRouter()
const route = useRoute()
const dialogVisible = ref(true)
const cargando = ref(false)
const ordenSeleccionado = ref('votos_desc')
const { resolverIncidencia } = useResolverIncidencia()
const whatsAppShare = useWhatsAppShare()
const { añadirFavorito, esFavorito, loadFavoritos } = useFavoritosStore()
const mostrarDialogoConfirmacion = ref(false)
const mostrarDialogoWhatsApp = ref(false)
const mostrarDialogoError = ref(false)
const mostrarDialogoAdvertencia = ref(false)
const captchaContainer = ref(null)
const captchaSolution = ref(null)
const captchaWidget = ref(null)
const incidenciaSeleccionada = ref(null)
const añadirAFavoritas = ref(true)
const nombreUsuario = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const mensajeError = ref('')
const captchaHabilitado = ref(import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED === 'true')
const friendlyCaptchaSiteKey = import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY

const opcionesOrden = [
  { title: 'Más votos primero', value: 'votos_desc' },
  { title: 'Más antiguos primero', value: 'fecha_asc' },
  { title: 'Más recientes primero', value: 'fecha_desc' }
]

const props = defineProps({
  incidencias: {
    type: Array,
    required: true
  }
})

const incidenciasFiltradas = computed(() => {
  if (!props.incidencias) return []
  
  let incidenciasFiltradas = props.incidencias
    .filter(inc => inc.estado === 'activa' && inc.reportes_solucion > 0)
    .map(inc => reactive({
      ...inc,
      faldonOculto: false
    }))

  // Aplicar ordenamiento según ordenSeleccionado
  switch (ordenSeleccionado.value) {
    case 'votos_desc':
      incidenciasFiltradas.sort((a, b) => b.reportes_solucion - a.reportes_solucion)
      break
    case 'fecha_asc':
      incidenciasFiltradas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      break
    case 'fecha_desc':
      incidenciasFiltradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      break
  }

  return incidenciasFiltradas
})

const cerrar = () => {
  dialogVisible.value = false
  router.push('/')
}

const abrirDetalleIncidencia = (incidencia) => {
  router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } })
}

const handleImageError = (event) => {
  event.target.src = '/img/no-image.png'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  return date.toLocaleDateString('es-ES', options).replace(',', '')
}

const obtenerIconoTipo = (tipo) => {
  const tipoInicial = TIPOS_INCIDENCIAS_INICIALES.find(t => t.tipo === tipo)
  return tipoInicial?.icono || 'mdi-tag-outline'
}

const ocultarFaldon = (incidencia) => {
  const index = incidenciasFiltradas.value.findIndex(inc => inc.id === incidencia.id)
  if (index !== -1) {
    incidenciasFiltradas.value[index].faldonOculto = true
  }
}

const verificarEstadoIncidencia = async (incidenciaId, estado) => {
  try {
    const idNumerico = parseInt(incidenciaId, 10)
    incidenciaSeleccionada.value = incidenciasFiltradas.value.find(inc => inc.id === idNumerico)
    if (!incidenciaSeleccionada.value) return

    if (estado === 'activa') {
      if (whatsAppShare.isEnabled.value) {
        añadirAFavoritas.value = !esFavorito(incidenciaSeleccionada.value.id)
        mostrarDialogoWhatsApp.value = true
      } else {
        ocultarFaldon(incidenciaSeleccionada.value)
      }
    } else if (estado === 'solucionada') {
      mostrarDialogoConfirmacion.value = true
      await nextTick()
      inicializarCaptcha()
    } else {
      ocultarFaldon(incidenciaSeleccionada.value)
    }
  } catch (error) {
    console.error('Error en verificarEstadoIncidencia:', error)
  }
}

const inicializarCaptcha = () => {
  if (captchaHabilitado.value && captchaContainer.value) {
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

const confirmarSolucion = async () => {
  if (!captchaSolution.value) {
    mostrarError('Por favor, completa el captcha.');
    return;
  }

  if (!nombreUsuario.value || !nombreUsuario.value.trim()) {
    mostrarError('El nombre o apodo es necesario');
    return;
  }

  guardarNombre();
  mostrarDialogoConfirmacion.value = false;

  try {
    const codigoUnico = localStorage.getItem(`incidencia_${incidenciaSeleccionada.value.id}`);
    const resultado = await resolverIncidencia(
      incidenciaSeleccionada.value.id,
      captchaSolution.value,
      codigoUnico,
      String(nombreUsuario.value).trim()
    );
    
    if (resultado.solucionada) {
      const index = incidenciasFiltradas.value.findIndex(inc => inc.id === incidenciaSeleccionada.value.id);
      if (index !== -1) {
        incidenciasFiltradas.value[index] = {
          ...incidenciasFiltradas.value[index],
          estado: 'solucionada',
          fecha_solucion: new Date().toISOString(),
          faldonOculto: true
        };
      }
      mostrarMensaje(resultado.esAutor ? `Incidencia marcada como ${textoEstadoSolucionado.value.toLowerCase()}` : `Se añadió tu voto de ${textoEstadoSolucionado.value.toLowerCase()}`);
    } else {
      const index = incidenciasFiltradas.value.findIndex(inc => inc.id === incidenciaSeleccionada.value.id);
      if (index !== -1) {
        incidenciasFiltradas.value[index] = {
          ...incidenciasFiltradas.value[index],
          reportes_solucion: resultado.reportes_solucion
        };
      }
      mostrarMensaje(`Se añadió tu voto de ${textoEstadoSolucionado.value.toLowerCase()}`);
    }

    // Forzar la actualización del computed
    props.incidencias = [...props.incidencias];

  } catch (error) {
    console.error('Error en confirmarSolucion:', error);
    mostrarError(error.response?.data?.error || `Error al marcar como ${textoEstadoSolucionado.value.toLowerCase()}`);
  } finally {
    if (captchaWidget.value) {
      captchaWidget.value.reset();
    }
    captchaSolution.value = null;
  }
};

const cancelarConfirmacion = () => {
  mostrarDialogoConfirmacion.value = false
  mostrarDialogoAdvertencia.value = true
}

const enviarWhatsAppYFavoritos = async () => {
  if (incidenciaSeleccionada.value) {
    await whatsAppShare.enviarWhatsApp(incidenciaSeleccionada.value);
    if (añadirAFavoritas.value) {
      añadirFavorito(incidenciaSeleccionada.value.id);
      const index = incidenciasFiltradas.value.findIndex(inc => inc.id === incidenciaSeleccionada.value.id);
      if (index !== -1) {
        incidenciasFiltradas.value[index] = {
          ...incidenciasFiltradas.value[index],
          esFavorita: true
        };
      }
    }
  }
  mostrarDialogoWhatsApp.value = false;
};

watch(() => route.name, (newRouteName) => {
  dialogVisible.value = newRouteName === 'PendientesValidar'
}, { immediate: true })

watch(dialogVisible, (newValue) => {
  if (!newValue && route.name === 'PendientesValidar') {
    router.push({ name: 'Home' })
  }
})

onMounted(async () => {
  if (route.name === 'PendientesValidar') {
    dialogVisible.value = true
  }
  await loadFavoritos()
  cargarNombreGuardado()
})

const textoEstadoSolucionado = computed(() => 
  import.meta.env.VITE_TEXTO_ESTADO_SOLUCIONADO || 'Solucionada'
)

const mostrarFaldon = (incidencia) => {
  return incidencia.faldonOculto !== undefined && !incidencia.faldonOculto
}

const mostrarMensaje = (mensaje) => {
  snackbarText.value = mensaje;
  snackbar.value = true;
};

const mostrarError = (mensaje) => {
  mensajeError.value = mensaje;
  mostrarDialogoError.value = true;
};

const cargarNombreGuardado = () => {
  const nombreGuardado = localStorage.getItem('nombreUsuario');
  if (nombreGuardado) {
    nombreUsuario.value = nombreGuardado;
  }
};

const guardarNombre = () => {
  if (nombreUsuario.value && nombreUsuario.value.trim()) {
    localStorage.setItem('nombreUsuario', nombreUsuario.value.trim());
  }
};
</script>

<style scoped>
.pendientes-validar-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mapa-container {
  width: 100%;
  height: 50vh;
}

.incidencia-card {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
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

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #999;
  height: 100%;
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

.info-banner {
  font-size: smaller;
}

.popup-verification {
  background-color: #ffffff;
  border-top: 1px solid #ddd;
  padding: 4px 8px;
  border: none;
}

.popup-verification p {
  margin: 0 0 4px 0;
  font-weight: normal;
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  background-color: #ffffff;
  box-shadow: none;
}

.verify-btn .v-icon {
  margin-right: 2px;
  font-size: 0.8rem;
}

.verify-yes { color: #4caf4f !important; }
.verify-no { color: #c4807c !important; }
.verify-unknown { color: #9e9e9e !important; }

.verify-btn:hover {
  opacity: 0.8;
}
</style>