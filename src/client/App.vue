<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Basura Cero</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <MapaIncidencias 
          :incidencias="incidencias" 
          :incluirSolucionadas="incluirSolucionadas"
          @ubicacion-seleccionada="actualizarUbicacion"
          @abrir-formulario="mostrarFormulario = true"
          @incidencia-seleccionada="abrirDetalleIncidencia"
          :ubicacionSeleccionada="ubicacionSeleccionada"
        />
        
        <v-card class="mt-4">
          <v-card-text>
            <div class="text-h6">{{ textoTotalIncidencias }}</div>
            <v-switch
              v-model="incluirSolucionadas"
              label="Incluir incidencias solucionadas"
              @change="obtenerIncidencias"
            ></v-switch>
          </v-card-text>
        </v-card>

        <ListaIncidencias :incidencias="incidenciasPaginadas" />
        
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          @input="obtenerIncidencias"
        ></v-pagination>
      </v-container>
    </v-main>

    <v-btn
      fab
      large
      color="primary"
      fixed
      bottom
      right
      @click="mostrarFormulario = true"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <v-dialog v-model="mostrarFormulario" max-width="600px">
      <ReportarIncidencia 
        @incidencia-creada="incidenciaCreada" 
        :ubicacionSeleccionada="ubicacionSeleccionada"
        @cerrar="mostrarFormulario = false"
      />
    </v-dialog>

    <ImageModal ref="imageModal" />

    <v-snackbar v-model="mostrarMensajeExito" :timeout="3000" color="success">
      {{ mensajeExito }}
    </v-snackbar>

    <v-dialog v-model="!!incidenciaSeleccionada" fullscreen>
      <DetalleIncidencia 
        v-if="incidenciaSeleccionada" 
        :incidencia="incidenciaSeleccionada"
        @cerrar="incidenciaSeleccionada = null"
      />
    </v-dialog>
  </v-app>
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
    const mostrarMensajeExito = ref(false)

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
      mostrarMensajeExito.value = true
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
      mostrarMensajeExito.value = true
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
      incidenciaSeleccionada,
      mostrarMensajeExito
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