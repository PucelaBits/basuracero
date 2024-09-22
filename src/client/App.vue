<template>
  <div id="app">
    <header>
      <h1>Basura Cero</h1>
    </header>
    <main>
      <MapaIncidencias 
        :incidencias="incidencias" 
        :incluirSolucionadas="incluirSolucionadas"
        @ubicacion-seleccionada="actualizarUbicacion"
        @abrir-formulario="mostrarFormulario = true"
        @incidencia-seleccionada="abrirDetalleIncidencia"
        :ubicacionSeleccionada="ubicacionSeleccionada"
      />
      <div class="total-incidencias">{{ textoTotalIncidencias }}</div>
      <div class="filtros">
        <label>
          <input type="checkbox" v-model="incluirSolucionadas" @change="obtenerIncidencias">
          Incluir incidencias solucionadas
        </label>
      </div>
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
    <DetalleIncidencia 
      v-if="incidenciaSeleccionada" 
      :incidencia="incidenciaSeleccionada"
      @cerrar="incidenciaSeleccionada = null"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import ReportarIncidencia from './components/ReportarIncidencia.vue'
import ListaIncidencias from './components/ListaIncidencias.vue'
import MapaIncidencias from './components/MapaIncidencias.vue'
import ImageModal from './components/ImageModal.vue'
import DetalleIncidencia from './components/DetalleIncidencia.vue'

export default {
  name: 'App',
  components: {
    ReportarIncidencia,
    ListaIncidencias,
    MapaIncidencias,
    ImageModal,
    DetalleIncidencia
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
    const incluirSolucionadas = ref(false)
    const incidenciaSeleccionada = ref(null)
    
    const totalIncidencias = computed(() => incidencias.value.length)
    const textoTotalIncidencias = computed(() => {
      if (incluirSolucionadas.value) {
        return `${totalIncidencias.value} incidencias reportadas`
      } else {
        return `${totalIncidencias.value} incidencias abiertas`
      }
    })

    const obtenerIncidencias = async () => {
      try {
        const response = await axios.get(`/api/incidencias?page=${currentPage.value}&limit=${itemsPerPage}&incluirSolucionadas=${incluirSolucionadas.value}`)
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

    const abrirDetalleIncidencia = (incidencia) => {
      console.log('Abriendo detalle de incidencia:', incidencia);
      incidenciaSeleccionada.value = incidencia;
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
      totalIncidencias,
      textoTotalIncidencias,
      incluirSolucionadas,
      obtenerIncidencias,
      abrirDetalleIncidencia,
      incidenciaSeleccionada
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

.filtros {
  margin: 10px 0;
  text-align: center;
}

.filtros label {
  cursor: pointer;
}
</style>