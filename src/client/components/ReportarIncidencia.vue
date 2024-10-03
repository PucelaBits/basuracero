<template>
  <div>
    <v-dialog 
      v-model="dialog" 
      :max-width="$vuetify.display.smAndDown ? '99%' : '600px'"
      :fullscreen="$vuetify.display.xs"
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          Enviar incidencia
          <v-btn icon @click="cerrar">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="text-center">
          <v-alert color="grey" elevation="2" class="aviso-formulario">
            <span style="font-size: 0.8em;"><v-icon>mdi-information</v-icon> Evitar informar de incidencias que lleven menos de 24h activas</span>
          </v-alert>
        </v-card-text>
        <v-card-text>
          <v-form ref="form" @submit.prevent="enviarIncidencia" v-model="formValido">
            <v-text-field
              v-model="incidencia.nombre"
              label="Tu nombre o apodo"
              :rules="[
                v => !!v || 'El nombre o apodo es necesario',
                v => /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]{1,20}$/.test(v) || 'Solo letras, números y espacios. Máximo 20 caracteres.'
              ]"
              counter="20"
              maxlength="20"
              required
            ></v-text-field>
            
            <v-checkbox
              v-model="recordarNombre"
              label="Recordar mi nombre"
              class="mb-4"
            ></v-checkbox>
            
            <v-select
              v-model="incidencia.tipo_id"
              :items="tiposIncidencias"
              item-title="nombre"
              item-value="id"
              label="Tipo"
              :rules="[v => !!v || 'El tipo es necesario']"
              required
            ></v-select>
            
            <v-textarea
              v-model="incidencia.descripcion"
              label="Descripción"
              :rules="[v => !!v || 'La descripción es necesaria']"
              required
            >
              <template v-slot:append-inner>
                <div class="mic-container">
                  <v-icon
                    v-if="reconocimientoVozDisponible"
                    @click="activarReconocimientoVoz"
                    :color="reconocimientoVozActivo ? 'primary' : 'grey'"
                    :class="{ 'pulsating': reconocimientoVozActivo }"
                  >
                    mdi-microphone
                  </v-icon>
                </div>
              </template>
            </v-textarea>
            
            <v-text-field
              v-model="incidencia.latitud"
              label="Latitud"
              type="number"
              step="any"
              :rules="[v => !!v || 'La latitud es necesaria']"
              required
              @input="obtenerDireccion"
              v-show="false"
            ></v-text-field>
            
            <v-text-field
              v-model="incidencia.longitud"
              label="Longitud"
              type="number"
              step="any"
              :rules="[v => !!v || 'La longitud es necesaria']"
              required
              @input="obtenerDireccion"
              v-show="false"
            ></v-text-field>
            
            <v-textarea
              v-model="direccion"
              label="Dirección"
              readonly
              dense
              auto-grow
              rows="2"
              row-height="18"
              class="mb-4"
              :rules="[validarCoordenadas]"
              :error-messages="validarCoordenadas() !== true ? [validarCoordenadas()] : []"
            >
              <template v-slot:prepend>
                <v-icon>mdi-map-marker</v-icon>
              </template>
            </v-textarea>
            
            <v-row justify="center" class="mb-4">
              <v-col cols="12" class="text-center">
                <v-btn @click="obtenerUbicacion" color="primary" :loading="obteniendoUbicacion">
                  <v-icon left>mdi-map-marker</v-icon>
                  &nbsp;Usar tu ubicación
                </v-btn>
              </v-col>
              <v-col cols="12" class="text-center">
                <v-btn @click="seleccionarEnMapa" color="secondary">
                  <v-icon left>mdi-map</v-icon>
                  &nbsp;Seleccionar en mapa
                </v-btn>
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="6 px-1">
                <v-btn block color="success" @click="tomarFoto" :disabled="incidencia.imagenes.length >= 2">
                  <v-icon start>mdi-camera</v-icon>
                  Hacer foto
                </v-btn>
              </v-col>
              <v-col cols="6 px-1">
                <v-btn block color="info" @click="abrirSelectorArchivos" :disabled="incidencia.imagenes.length >= 2">
                  <v-icon start>mdi-upload</v-icon>
                  Subir fotos
                </v-btn>
              </v-col>
            </v-row>

            <v-list v-if="incidencia.imagenes.length > 0" class="mt-3">
              <v-list-item v-for="(imagen, index) in incidencia.imagenes" :key="index">
                <template v-slot:prepend>
                  <v-icon icon="mdi-file-image"></v-icon>
                </template>
                <v-list-item-title>{{ imagen.name }}</v-list-item-title>
                <template v-slot:append>
                  <v-btn icon="mdi-delete" variant="text" @click="removeImage(index)"></v-btn>
                </template>
              </v-list-item>
            </v-list>

            <v-row v-if="previewUrls.length > 0" class="mt-3">
              <v-col v-for="(url, index) in previewUrls" :key="index" cols="6">
                <v-img
                  :src="url"
                  aspect-ratio="1"
                  class="grey lighten-2"
                  cover
                >
                  <template v-slot:placeholder>
                    <v-row class="fill-height ma-0" align="center" justify="center">
                      <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                    </v-row>
                  </template>
                </v-img>
              </v-col>
            </v-row>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref="cameraInput"
              style="display: none"
              @change="onCameraCapture"
            >

            <input
              type="file"
              accept="image/*"
              ref="fileInput"
              style="display: none"
              @change="onFilesSelected"
              multiple
            >

            <div class="subtitle-text text-center mt-4">
              <v-icon color="grey mr-2">mdi-information</v-icon>
              <span color="grey">Máx. 2 fotos.No incluya caras de personas, matrículas o info personal</span>
            </div>

            <v-checkbox
              v-model="aceptaLicencia"
              :rules="[v => !!v || 'Debes aceptar los términos de la licencia para continuar']"
              required
            >
              <template v-slot:label>
                <div class="subtitle-text">
                  Acepto que el texto y las fotos subidas serán publicados bajo licencia 
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">CC BY-SA 4.0</a>
                </div>
              </template>
            </v-checkbox>
            
            <div ref="captchaContainer" class="frc-captcha" :data-sitekey="friendlyCaptchaSitekey" data-lang="es"></div>

            <div class="subtitle-text">Se guardará una versión anonimizada de tu IP para evitar abusos</div>

            <v-dialog v-model="mostrarDialogoIncidenciasCercanas" max-width="500px">
              <v-card>
                <v-card-title>
                  Posible duplicada
                </v-card-title>
                <v-card-text>
                  <p>Hay {{ incidenciasCercanas.length }} incidencia{{ incidenciasCercanas.length !== 1 ? 's' : '' }} cercana{{ incidenciasCercanas.length !== 1 ? 's' : '' }} similar{{ incidenciasCercanas.length !== 1 ? 'es' : '' }}. Por favor compruébela{{ incidenciasCercanas.length !== 1 ? 's' : '' }} primero y no rellene una duplicada.</p>
                  
                  <v-list>
                    <v-list-item v-for="incidencia in incidenciasCercanas" :key="incidencia.id" @click="abrirIncidenciaCercana(incidencia.id)">
                      <template v-slot:prepend>
                        <v-avatar size="50">
                          <v-img :src="incidencia.imagen" cover></v-img>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ incidencia.tipo }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ incidencia.descripcion.substring(0, 50) }}...
                      </v-list-item-subtitle>
                      <v-list-item-subtitle class="mt-1">
                        A {{ incidencia.distancia }} m.
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="cerrarDialogoIncidenciasCercanas">
                    No, es una diferente
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

            <v-row justify="center">
              <v-col cols="12" class="text-center">
                <v-btn
                  color="primary"
                  @click="enviarIncidencia"
                  :loading="enviando"
                  :disabled="!formValido || enviando || !incidencia.imagenes || incidencia.imagenes.length === 0 || !aceptaLicencia"
                >
                  {{ enviando ? 'Enviando...' : 'Enviar' }}
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mostrarDialogoError" max-width="400px">
      <v-card>
        <v-card-title class="headline">Error de ubicación</v-card-title>
        <v-card-text>{{ mensajeError }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mostrarDialogoError = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import axios from 'axios'
import { WidgetInstance } from 'friendly-challenge'
import { useRouter } from 'vue-router';
import DetalleIncidencia from './DetalleIncidencia.vue';
import { enviarEventoMatomo } from '../utils/analytics';
import { useIncidenciasUsuarioStore } from '../store/incidenciasUsuarioStore' // Importar el store

const CIUDAD_LAT_MIN = parseFloat(import.meta.env.VITE_CIUDAD_LAT_MIN);
const CIUDAD_LAT_MAX = parseFloat(import.meta.env.VITE_CIUDAD_LAT_MAX);
const CIUDAD_LON_MIN = parseFloat(import.meta.env.VITE_CIUDAD_LON_MIN);
const CIUDAD_LON_MAX = parseFloat(import.meta.env.VITE_CIUDAD_LON_MAX);

export default {
  name: 'ReportarIncidencia',
  components: {
    DetalleIncidencia
  },
  props: {
    modelValue: Boolean,
    ubicacionSeleccionada: {
      type: Object,
      default: () => ({})
    },
    datosFormulario: {
      type: Object,
      default: () => ({})
    },
    todasLasIncidencias: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'incidencia-creada', 'seleccionar-en-mapa', 'actualizar-datos', 'incidencia-seleccionada'],
  setup(props, { emit }) {
    const { smAndDown, xs } = useDisplay()
    const dialog = ref(props.modelValue)
    const form = ref(null)
    const formValido = ref(false)
    const incidencia = ref({ ...props.datosFormulario, imagenes: [] })
    const tiposIncidencias = ref([])
    const previewUrls = ref([])
    const enviando = ref(false)
    const direccion = ref('')
    const captchaContainer = ref(null)
    const captchaSolution = ref(null)
    const captchaWidget = ref(null)
    const friendlyCaptchaSitekey = ref(import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY)
    const mostrarDialogoError = ref(false)
    const mensajeError = ref('')
    const obteniendoUbicacion = ref(false)
    const incidenciasCercanas = ref([])
    const mostrarDialogoIncidenciasCercanas = ref(false)
    const router = useRouter();
    const reconocimientoVozActivo = ref(false)
    const reconocimientoVozDisponible = ref(false)
    let reconocimientoVoz = null
    const recordarNombre = ref(true)
    const cameraInput = ref(null)
    const fileInput = ref(null)
    const aceptaLicencia = ref(false)
    const { incidenciasUsuario, añadirIncidenciaUsuario } = useIncidenciasUsuarioStore() // Usar el store

    const validarCoordenadas = () => {
      if (!incidencia.value.latitud || !incidencia.value.longitud) {
        return true; // No mostrar error si los campos están vacíos
      }
      const lat = parseFloat(incidencia.value.latitud);
      const lon = parseFloat(incidencia.value.longitud);
      if (isNaN(lat) || isNaN(lon) || 
          lat < CIUDAD_LAT_MIN || lat > CIUDAD_LAT_MAX ||
          lon < CIUDAD_LON_MIN || lon > CIUDAD_LON_MAX) {
        return 'Ubicación fuera de los límites de la ciudad';
      }
      return true;
    };

    const cerrar = () => {
      dialog.value = false
    }

    const tomarFoto = () => {
      if (cameraInput.value && incidencia.value.imagenes.length < 2) {
        cameraInput.value.click()
      }
    }

    const abrirSelectorArchivos = () => {
      if (fileInput.value && incidencia.value.imagenes.length < 2) {
        fileInput.value.click()
      }
    }

    const onFilesSelected = (event) => {
      const files = event.target.files
      if (files && files.length > 0) {
        const newImages = Array.from(files).slice(0, 2 - incidencia.value.imagenes.length)
        incidencia.value.imagenes = [...incidencia.value.imagenes, ...newImages].slice(0, 2)
        updatePreviewUrls()
      }
    }

    const onCameraCapture = (event) => {
      const file = event.target.files[0]
      if (file && incidencia.value.imagenes.length < 2) {
        incidencia.value.imagenes.push(file)
        updatePreviewUrls()
      }
    }

    const removeImage = (index) => {
      incidencia.value.imagenes.splice(index, 1)
      updatePreviewUrls()
    }

    const updatePreviewUrls = () => {
      previewUrls.value = incidencia.value.imagenes.map(file => URL.createObjectURL(file))
    }

    const obtenerTiposIncidencias = async () => {
      try {
        const response = await axios.get('/api/incidencias/tipos')
        tiposIncidencias.value = response.data
      } catch (error) {
        console.error('Error al obtener tipos de incidencias:', error)
      }
    }

    const obtenerDireccion = async () => {
      if (incidencia.value.latitud && incidencia.value.longitud) {
        const validacionResult = validarCoordenadas();
        if (validacionResult === true) {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${incidencia.value.latitud}&lon=${incidencia.value.longitud}&zoom=18&addressdetails=1&accept-language=es`
          try {
            const response = await fetch(url)
            const data = await response.json()
            direccion.value = data.display_name
            incidencia.value.barrio = data.address.suburb || data.address.neighbourhood || ''
          } catch (error) {
            console.error('Error al obtener la dirección:', error)
            direccion.value = 'No se pudo obtener la dirección'
            incidencia.value.barrio = ''
          }
        } else {
          incidencia.value.barrio = ''
        }
      } else {
        direccion.value = ''
        incidencia.value.barrio = ''
      }
      if (form.value) {
        form.value.validate()
      }
    }

    const obtenerUbicacion = () => {
      if ("geolocation" in navigator) {
        obteniendoUbicacion.value = true;
        const opciones = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            incidencia.value.latitud = position.coords.latitude;
            incidencia.value.longitud = position.coords.longitude;
            await obtenerDireccion();
            obteniendoUbicacion.value = false;
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message);
            mensajeError.value = "No se pudo obtener la ubicación actual. Por favor, intente de nuevo o ingrese las coordenadas en el mapa";
            mostrarDialogoError.value = true;
            obteniendoUbicacion.value = false;
          },
          opciones
        );
      } else {
        mensajeError.value = "La geolocalización no está disponible en este navegador";
        mostrarDialogoError.value = true;
      }
    }

    const enviarIncidencia = async () => {
      if (!form.value.validate()) return

      guardarNombre()

      enviando.value = true
      try {
        const formData = new FormData()
        for (const key in incidencia.value) {
          if (key === 'imagenes') {
            incidencia.value[key].forEach((imagen, index) => {
              formData.append(`imagenes`, imagen);
            });
          } else if (incidencia.value[key] !== null && incidencia.value[key] !== undefined) {
            formData.append(key, incidencia.value[key])
          }
        }
        formData.append('direccion', direccion.value)
        formData.append('frc-captcha-solution', captchaSolution.value)

        const response = await axios.post('/api/incidencias', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const { id, codigoUnico } = response.data;
        
        // Usar el store para añadir la incidencia del usuario
        añadirIncidenciaUsuario(id, codigoUnico)
        
        enviarEventoMatomo('Incidencia', 'Enviar', 'Éxito', incidencia.value.tipo_id);
        emit('incidencia-creada', id);
        cerrar();
        resetForm();
        emit('actualizar-datos', {
          tipo_id: '',
          descripcion: '',
          latitud: null,
          longitud: null,
          imagenes: [],
          nombre: ''
        });
      } catch (error) {
        console.error('Error al enviar incidencia:', error)
        alert('Hubo un error al enviar la incidencia. Por favor, intente de nuevo.')
      } finally {
        enviando.value = false
      }
    }

    const resetForm = () => {
      incidencia.value = {
        tipo_id: '',
        descripcion: '',
        latitud: null,
        longitud: null,
        imagenes: [],
        nombre: ''
      }
      previewUrls.value = []
      direccion.value = ''
      aceptaLicencia.value = false
      if (form.value) {
        form.value.reset()
        form.value.resetValidation()
      }
    }

    const seleccionarEnMapa = () => {
      emit('seleccionar-en-mapa')
      cerrar()
    }

    const verificarIncidenciasCercanas = () => {
      if (incidencia.value.tipo_id && incidencia.value.latitud && incidencia.value.longitud) {
        incidenciasCercanas.value = props.todasLasIncidencias
          .map(inc => {
            const distancia = calcularDistancia(
              incidencia.value.latitud, 
              incidencia.value.longitud, 
              inc.latitud, 
              inc.longitud
            );
            if (inc.tipo_id === incidencia.value.tipo_id && distancia <= 50) {
              return { ...inc, distancia: Math.round(distancia) };
            }
            return null;
          })
          .filter(Boolean);
        if (incidenciasCercanas.value.length > 0) {
          mostrarDialogoIncidenciasCercanas.value = true;
        }
      } else {
        incidenciasCercanas.value = [];
      }
    };

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Radio de la Tierra en metros
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // en metros
    };

    const abrirIncidenciaCercana = (id) => {
      const incidenciaSeleccionada = props.todasLasIncidencias.find(inc => inc.id === id);
      if (incidenciaSeleccionada) {
        emit('incidencia-seleccionada', incidenciaSeleccionada);
        router.push({ name: 'DetalleIncidencia', params: { id: incidenciaSeleccionada.id } });
      }
    };

    const cerrarDialogoIncidenciasCercanas = () => {
      mostrarDialogoIncidenciasCercanas.value = false;
    };

    const verificarSoporteReconocimientoVoz = () => {
      reconocimientoVozDisponible.value = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    }

    const activarReconocimientoVoz = () => {
      if (reconocimientoVozDisponible.value) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        reconocimientoVoz = new SpeechRecognition()
        reconocimientoVoz.lang = 'es-ES'
        reconocimientoVoz.continuous = false
        reconocimientoVoz.interimResults = false

        reconocimientoVoz.onstart = () => {
          reconocimientoVozActivo.value = true
        }

        reconocimientoVoz.onend = () => {
          reconocimientoVozActivo.value = false
        }

        reconocimientoVoz.onresult = (event) => {
          const resultado = event.results[0][0].transcript
          incidencia.value.descripcion += (incidencia.value.descripcion ? ' ' : '') + resultado
        }

        reconocimientoVoz.onerror = (event) => {
          console.error('Error en el reconocimiento de voz:', event.error)
          reconocimientoVozActivo.value = false
        }

        reconocimientoVoz.start()
      }
    }

    const cargarNombreGuardado = () => {
      const nombreGuardado = localStorage.getItem('nombreUsuario')
      if (nombreGuardado) {
        incidencia.value.nombre = nombreGuardado
      }
    }

    const guardarNombre = () => {
      if (recordarNombre.value && incidencia.value.nombre) {
        localStorage.setItem('nombreUsuario', incidencia.value.nombre)
      } else {
        localStorage.removeItem('nombreUsuario')
      }
    }

    watch(() => props.modelValue, (newVal) => {
      dialog.value = newVal
    })

    watch(dialog, (newVal) => {
      emit('update:modelValue', newVal)
    })

    watch(() => props.ubicacionSeleccionada, (newUbicacion) => {
      if (newUbicacion.latitud && newUbicacion.longitud) {
        incidencia.value.latitud = newUbicacion.latitud
        incidencia.value.longitud = newUbicacion.longitud
        obtenerDireccion()
      }
    }, { immediate: true })

    watch(incidencia, (newValue) => {
      emit('actualizar-datos', newValue);
    }, { deep: true });

    watch([() => incidencia.value.tipo_id, () => incidencia.value.latitud, () => incidencia.value.longitud], 
      () => {
        verificarIncidenciasCercanas();
      }
    );

    watch(() => incidencia.value.imagenes, updatePreviewUrls, { deep: true })

    onMounted(() => {
      obtenerTiposIncidencias();

      // Verificar incidencias cercanas al cargar si los campos relevantes están rellenos
      if (incidencia.value.tipo_id && incidencia.value.latitud && incidencia.value.longitud) {
        verificarIncidenciasCercanas();
      }

      if (import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED === 'true' && captchaContainer.value) {
        captchaWidget.value = new WidgetInstance(captchaContainer.value, {
          startMode: "auto",
          sitekey: import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY,
          doneCallback: (solution) => {
            captchaSolution.value = solution;
          },
          errorCallback: (err) => {
            console.error("Error al resolver el Captcha:", err);
          }
        });
      }

      verificarSoporteReconocimientoVoz()
      cargarNombreGuardado()
    })

    onUnmounted(() => {
      if (captchaWidget.value) {
        captchaWidget.value.destroy()
      }
      if (reconocimientoVoz) {
        reconocimientoVoz.stop()
      }
    })

    return {
      dialog,
      form,
      formValido,
      incidencia,
      tiposIncidencias,
      previewUrls,
      enviando,
      direccion,
      cerrar,
      onFilesSelected,
      obtenerDireccion,
      obtenerUbicacion,
      enviarIncidencia,
      captchaContainer,
      smAndDown,
      xs,
      validarCoordenadas,
      seleccionarEnMapa,
      friendlyCaptchaSitekey,
      mostrarDialogoError,
      mensajeError,
      obteniendoUbicacion,
      incidenciasCercanas,
      mostrarDialogoIncidenciasCercanas,
      verificarIncidenciasCercanas,
      cerrarDialogoIncidenciasCercanas,
      abrirIncidenciaCercana,
      reconocimientoVozActivo,
      reconocimientoVozDisponible,
      activarReconocimientoVoz,
      recordarNombre,
      removeImage,
      cameraInput,
      fileInput,
      tomarFoto,
      abrirSelectorArchivos,
      onCameraCapture,
      aceptaLicencia,
      incidenciasUsuario,
    }
  }
}
</script>

<style scoped>

.frc-captcha {
  margin: 0.5em auto 1.5em auto;
}

.subtitle-text {
  color: grey;
  font-size: smaller;
  margin-bottom: 1.5em;
}

.aviso-formulario {
  color: #696969 !important;
  background-color: #f6f6f6 !important;
}

.mic-container {
  position: relative;
  width: 24px;
  height: 24px;
}

.pulsating::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.3);
  transform: translate(-50%, -50%);
  animation: pulse 1.5s ease-out infinite;
  z-index: -1;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  50% {
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0;
  }
}

.remove-image {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

a {
  color: var(--v-primary-base);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

</style>