<template>
  <div class="reportar-incidencia">
    <button class="cerrar-btn" @click="$emit('cerrar')">&times;</button>
    <h2>Nueva incidencia</h2>
    <form @submit.prevent="enviarIncidencia">
      <div class="form-group">
        <label for="nombre">Tu nombre:</label>
        <input id="nombre" type="text" v-model="incidencia.nombre" required>
      </div>
      <div class="form-group">
        <label for="tipo">Tipo:</label>
        <select id="tipo" v-model="incidencia.tipo_id" required>
          <option value="">Seleccione un tipo</option>
          <option v-for="tipo in tiposIncidencias" :key="tipo.id" :value="tipo.id">
            {{ tipo.nombre }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="descripcion">Descripción:</label>
        <textarea id="descripcion" v-model="incidencia.descripcion" required></textarea>
      </div>
      <div class="form-group">
        <label for="latitud">Latitud:</label>
        <input id="latitud" type="number" v-model="incidencia.latitud" step="any" required @change="obtenerDireccion">
      </div>
      <div class="form-group">
        <label for="longitud">Longitud:</label>
        <input id="longitud" type="number" v-model="incidencia.longitud" step="any" required @change="obtenerDireccion">
      </div>
      <div v-if="direccion" class="direccion-container">
        <p class="direccion">{{ direccion }}</p>
      </div>
      <button type="button" @click="obtenerUbicacion" class="btn-ubicacion">Usar mi ubicación actual</button>
      <div
        class="imagen-drop-zone"
        @dragover.prevent
        @drop.prevent="onDrop"
        @paste="onPaste"
        :class="{ 'is-invalid': !incidencia.imagen && formSubmitted }"
      >
        <input
          id="imagen"
          type="file"
          @change="onFileSelected"
          accept="image/*"
          capture="environment"
          ref="fileInput"
          style="display: none;"
        >
        <label for="imagen" class="imagen-label">
          <span v-if="!incidencia.imagen">Hacer o subir una foto</span>
          <span v-else>{{ incidencia.imagen.name }}</span>
        </label>
        <img v-if="previewUrl" :src="previewUrl" alt="Vista previa" class="imagen-preview" />
      </div>
      <div v-if="errores.length > 0" class="error-message">
        <ul>
          <li v-for="(error, index) in errores" :key="index">{{ error }}</li>
        </ul>
      </div>
      <button type="submit" class="btn-enviar" :disabled="enviando">
        {{ enviando ? 'Enviando...' : 'Enviar' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

export default {
  name: 'ReportarIncidencia',
  emits: ['incidencia-creada', 'ubicacion-seleccionada', 'cerrar'],
  props: {
    ubicacionSeleccionada: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { emit }) {
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
    const fileInput = ref(null)
    const formSubmitted = ref(false)
    const honeypot = ref('')
    const errores = ref([])
    const enviando = ref(false)
    const direccion = ref('')

    const onFileSelected = (event) => {
      handleFile(event.target.files[0])
    }

    const onDrop = (event) => {
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      }
    }

    const onPaste = (event) => {
      const items = (event.clipboardData || event.originalEvent.clipboardData).items
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          handleFile(file)
          break
        }
      }
    }

    const handleFile = (file) => {
      if (file && file.type.startsWith('image/')) {
        incidencia.value.imagen = file
        previewUrl.value = URL.createObjectURL(file)
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
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${incidencia.value.latitud}&lon=${incidencia.value.longitud}&zoom=18&addressdetails=1`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          direccion.value = data.display_name;
        } catch (error) {
          console.error('Error al obtener la dirección:', error);
          direccion.value = 'No se pudo obtener la dirección';
        }
      } else {
        direccion.value = '';
      }
    };

    const obtenerUbicacion = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            incidencia.value.latitud = position.coords.latitude;
            incidencia.value.longitud = position.coords.longitude;
            emit('ubicacion-seleccionada', {
              latitud: position.coords.latitude,
              longitud: position.coords.longitude
            });
            await obtenerDireccion();
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message);
            errores.value.push("No se pudo obtener la ubicación. Por favor, ingrese las coordenadas manualmente.");
          }
        );
      } else {
        errores.value.push("La geolocalización no está disponible en este navegador.");
      }
    }

    const validarFormulario = () => {
      errores.value = []
      if (!incidencia.value.nombre) errores.value.push('El nombre es requerido')
      if (!incidencia.value.tipo_id) errores.value.push('El tipo de incidencia es requerido')
      if (!incidencia.value.descripcion) errores.value.push('La descripción es requerida')
      if (!incidencia.value.latitud) errores.value.push('La latitud es requerida')
      if (!incidencia.value.longitud) errores.value.push('La longitud es requerida')
      if (!incidencia.value.imagen) errores.value.push('La imagen es requerida')
      return errores.value.length === 0
    }

    const enviarIncidencia = async () => {
      formSubmitted.value = true
      if (!validarFormulario()) return

      if (honeypot.value !== '') {
        console.log('Posible envío de bot detectado')
        errores.value.push('Error al enviar el formulario. Por favor, inténtelo de nuevo.')
        return
      }

      enviando.value = true
      try {
        // Obtener la dirección antes de enviar la incidencia
        await obtenerDireccion()

        const formData = new FormData()
        formData.append('tipo_id', incidencia.value.tipo_id)
        formData.append('descripcion', incidencia.value.descripcion)
        formData.append('latitud', incidencia.value.latitud)
        formData.append('longitud', incidencia.value.longitud)
        formData.append('imagen', incidencia.value.imagen)
        formData.append('nombre', incidencia.value.nombre)
        formData.append('direccion', direccion.value)  // Añadir la dirección al formData

        const response = await axios.post('/api/incidencias', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        emit('incidencia-creada')
        incidencia.value = { tipo_id: '', descripcion: '', latitud: null, longitud: null, imagen: null, nombre: '' }
        previewUrl.value = null
        formSubmitted.value = false
        direccion.value = ''  // Limpiar la dirección después de enviar
      } catch (error) {
        console.error('Error al enviar incidencia:', error)
        if (error.response && error.response.data && error.response.data.errores) {
          errores.value = error.response.data.errores
        } else {
          errores.value.push('Hubo un error al enviar la incidencia. Por favor, intente de nuevo.')
        }
      } finally {
        enviando.value = false
      }
    }

    onMounted(obtenerTiposIncidencias)

    watch(() => props.ubicacionSeleccionada, (newUbicacion) => {
      if (newUbicacion.latitud && newUbicacion.longitud) {
        incidencia.value.latitud = newUbicacion.latitud;
        incidencia.value.longitud = newUbicacion.longitud;
        obtenerDireccion();
      }
    }, { immediate: true })

    return {
      incidencia,
      tiposIncidencias,
      previewUrl,
      fileInput,
      formSubmitted,
      enviarIncidencia,
      onFileSelected,
      onDrop,
      onPaste,
      obtenerUbicacion,
      errores,
      enviando,
      honeypot,
      direccion,
      obtenerDireccion
    }
  }
}
</script>

<style scoped>
.reportar-incidencia {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.cerrar-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #34495e;
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #34495e;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 90%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  height: 100px;
  resize: vertical;
}

.btn-ubicacion, .btn-enviar {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-ubicacion {
  background-color: #2ecc71;
  color: white;
  margin-bottom: 1rem;
}

.btn-enviar {
  background-color: #6834db;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-enviar:hover {
  background-color: #5429b0;
}

.btn-enviar:disabled {
  background-color: #d1d1d1;
  cursor: not-allowed;
}

.imagen-drop-zone {
  border: 2px dashed #ddd;
  border-radius: 4px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: border-color 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
}

.imagen-drop-zone:hover {
  border-color: #3498db;
}

.imagen-label {
  display: inline-block;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.imagen-label:hover {
  background-color: #2980b9;
}

.imagen-preview {
  max-width: 100%;
  max-height: 200px;
  margin-top: 1rem;
  border-radius: 4px;
  object-fit: contain;
}

.error-message {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.error-message ul {
  list-style-type: none;
  padding-left: 0;
}

.error-message li {
  margin-bottom: 0.5rem;
}

.is-invalid {
  border-color: #e74c3c;
}

.direccion-container {
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}

.direccion {
  font-size: 0.9rem;
  color: #333;
  margin: 0;
}

.btn-ubicacion {
  background-color: #3498db;
  color: white;
  margin-bottom: 1rem;
}

.btn-ubicacion:hover {
  background-color: #2980b9;
}
</style>