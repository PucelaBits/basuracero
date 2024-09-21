<template>
  <div id="app">
    <header>
      <h1>Basura Cero</h1>
    </header>
    <main>
      <MapaIncidencias 
        :incidencias="incidencias" 
        @ubicacion-seleccionada="actualizarUbicacion"
        @abrir-formulario="mostrarFormulario = true"
        :ubicacionSeleccionada="ubicacionSeleccionada"
      />
      <div class="total-incidencias">{{ totalIncidencias }} incidencias reportadas</div>
      <div class="content-wrapper">
        <ListaIncidencias :incidencias="incidenciasPaginadas" />
        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1">Anterior</button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
        </div>
      </div>
    </main>
    <button @click="mostrarFormulario = true" class="boton-flotante">
      <i class="fas fa-plus"></i>
    </button>
    <div v-if="mostrarFormulario" class="modal-formulario">
      <ReportarIncidencia 
        @incidencia-creada="incidenciaCreada" 
        :ubicacionSeleccionada="ubicacionSeleccionada"
        @cerrar="mostrarFormulario = false"
      />
    </div>
    <ImageModal ref="imageModal" />
    <div v-if="mensajeExito" class="mensaje-exito">
      {{ mensajeExito }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import ReportarIncidencia from './components/ReportarIncidencia.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import MapaIncidencias from './components/MapaIncidencias.vue'
import ImageModal from './components/ImageModal.vue'

export default {
  name: 'App',
  components: {
    ReportarIncidencia,
    ListaIncidencias,
    MapaIncidencias,
    ImageModal
  },
  setup() {
    const incidencias = ref([])
    const ubicacionSeleccionada = ref({})
    const currentPage = ref(1)
    const totalPages = ref(1)
    const itemsPerPage = 10
    const reportarIncidencia = ref(null)
    const imageModal = ref(null)
    const mensajeExito = ref('')
    const mostrarFormulario = ref(false)
    const totalIncidencias = computed(() => incidencias.value.length)

    const obtenerIncidencias = async () => {
      try {
        const response = await axios.get(`/api/incidencias?page=${currentPage.value}&limit=${itemsPerPage}`)
        incidencias.value = response.data.incidencias
        currentPage.value = response.data.currentPage
        totalPages.value = response.data.totalPages
      } catch (error) {
        console.error('Error al obtener incidencias:', error.response ? error.response.data : error.message)
      }
    }

    const actualizarLista = () => {
      obtenerIncidencias()
      mensajeExito.value = 'Incidencia añadida con éxito'
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

    const incidenciasPaginadas = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return incidencias.value.slice(start, end)
    })

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
      obtenerIncidencias()
      mostrarFormulario.value = false
      mensajeExito.value = 'Incidencia añadida con éxito'
      setTimeout(() => {
        mensajeExito.value = ''
      }, 3000)
    }

    onMounted(obtenerIncidencias)

    return {
      incidencias,
      incidenciasPaginadas,
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
      totalIncidencias
    }
  }
}
</script>

<style>
/* ... (estilos existentes) ... */

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
</style>