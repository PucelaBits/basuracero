<template>
  <v-dialog 
    v-model="dialog" 
    :max-width="$vuetify.display.smAndDown ? '95%' : '600px'"

  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        Enviar incidencia
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" @submit.prevent="enviarIncidencia" v-model="formValido">
          <v-text-field
            v-model="incidencia.nombre"
            label="Tu nombre"
            :rules="[v => !!v || 'El nombre es requerido']"
            required
          ></v-text-field>
          
          <v-select
            v-model="incidencia.tipo_id"
            :items="tiposIncidencias"
            item-title="nombre"
            item-value="id"
            label="Tipo"
            :rules="[v => !!v || 'El tipo es requerido']"
            required
          ></v-select>
          
          <v-textarea
            v-model="incidencia.descripcion"
            label="Descripción"
            :rules="[v => !!v || 'La descripción es requerida']"
            required
          ></v-textarea>
          
          <v-text-field
            v-model="incidencia.latitud"
            label="Latitud"
            type="number"
            step="any"
            :rules="[v => !!v || 'La latitud es requerida']"
            required
            @input="obtenerDireccion"
          ></v-text-field>
          
          <v-text-field
            v-model="incidencia.longitud"
            label="Longitud"
            type="number"
            step="any"
            :rules="[v => !!v || 'La longitud es requerida']"
            required
            @input="obtenerDireccion"
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
            hide-details
          >
            <template v-slot:prepend>
              <v-icon>mdi-map-marker</v-icon>
            </template>
          </v-textarea>
          
          <v-row justify="center" class="mb-4">
            <v-col cols="12" class="text-center">
              <v-btn @click="obtenerUbicacion" color="primary">
                Usar tu ubicación actual
              </v-btn>
            </v-col>
          </v-row>
          
          <v-file-input
            v-model="incidencia.imagen"
            accept="image/*"
            label="Hacer o subir foto"
            prepend-icon="mdi-camera"
            @change="onFileSelected"
            :rules="[v => !!v || 'La imagen es requerida']"
            required
            show-size
          ></v-file-input>
          
          <v-img v-if="previewUrl" :src="previewUrl" max-height="200" class="mb-4"></v-img>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="enviarIncidencia"
          :loading="enviando"
          :disabled="!formValido || enviando || !incidencia.imagen"
        >
          {{ enviando ? 'Enviando...' : 'Enviar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, watch, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import axios from 'axios'

export default {
  name: 'ReportarIncidencia',
  props: {
    modelValue: Boolean,
    ubicacionSeleccionada: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'incidencia-creada'],
  setup(props, { emit }) {
    const { smAndDown, xs } = useDisplay()
    const dialog = ref(props.modelValue)
    const form = ref(null)
    const formValido = ref(false)
    const incidencia = ref({
      tipo_id: '',
      descripcion: '',
      latitud: null,
      longitud: null,
      imagen: null,
      nombre: ''
    })
    const tiposIncidencias = ref([])
    const previewUrl = ref(null)
    const enviando = ref(false)
    const direccion = ref('')

    const cerrar = () => {
      dialog.value = false
    }

    const onFileSelected = (event) => {
      const file = event && event.target ? event.target.files[0] : event
      if (file && file instanceof File) {
        incidencia.value.imagen = file
        try {
          previewUrl.value = URL.createObjectURL(file)
        } catch (error) {
          console.error('Error al crear URL para la vista previa:', error)
          previewUrl.value = null
        }
      } else {
        incidencia.value.imagen = null
        previewUrl.value = null
      }
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
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${incidencia.value.latitud}&lon=${incidencia.value.longitud}&zoom=18&addressdetails=1`
        try {
          const response = await fetch(url)
          const data = await response.json()
          direccion.value = data.display_name
        } catch (error) {
          console.error('Error al obtener la dirección:', error)
          direccion.value = 'No se pudo obtener la dirección'
        }
      } else {
        direccion.value = ''
      }
    }

    const obtenerUbicacion = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            incidencia.value.latitud = position.coords.latitude
            incidencia.value.longitud = position.coords.longitude
            await obtenerDireccion()
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message)
            alert("No se pudo obtener la ubicación. Por favor, ingrese las coordenadas manualmente.")
          }
        )
      } else {
        alert("La geolocalización no está disponible en este navegador.")
      }
    }

    const enviarIncidencia = async () => {
      if (!form.value.validate()) return

      enviando.value = true
      try {
        const formData = new FormData()
        for (const key in incidencia.value) {
          if (key === 'imagen' && incidencia.value[key] instanceof File) {
            formData.append(key, incidencia.value[key])
          } else if (incidencia.value[key] !== null && incidencia.value[key] !== undefined) {
            formData.append(key, incidencia.value[key])
          }
        }
        formData.append('direccion', direccion.value)

        await axios.post('/api/incidencias', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        emit('incidencia-creada')
        cerrar()
        resetForm()
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
        imagen: null,
        nombre: ''
      }
      previewUrl.value = null
      direccion.value = ''
      if (form.value) {
        form.value.reset()
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

    onMounted(obtenerTiposIncidencias)

    return {
      dialog,
      form,
      formValido,
      incidencia,
      tiposIncidencias,
      previewUrl,
      enviando,
      direccion,
      cerrar,
      onFileSelected,
      obtenerDireccion,
      obtenerUbicacion,
      enviarIncidencia,
      smAndDown,
      xs
    }
  }
}
</script>