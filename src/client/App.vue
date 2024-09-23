<template>
  <v-app>
    <v-app-bar app :color="theme.colors.primary" dark elevation="4" density="compact">
      <v-container class="d-flex justify-center">
        <v-toolbar-title class="text-h6 font-weight-bold">Basura Cero</v-toolbar-title>
      </v-container>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-0">
        <MapaIncidencias 
          :incidencias="incidencias" 
          :incluirSolucionadas="incluirSolucionadas"
          @ubicacion-seleccionada="actualizarUbicacion"
          @abrir-formulario="mostrarFormulario = true"
          @incidencia-seleccionada="abrirDetalleIncidencia"
          :ubicacionSeleccionada="ubicacionSeleccionada"
        />
        
        <v-card class="ma-4">
          <v-card-text>
            <v-switch
              v-model="incluirSolucionadas"
              label="Ver solucionadas"
              @change="obtenerIncidencias"
            ></v-switch>
            <div class="text-caption text-grey">{{ textoTotalIncidencias }}</div>
          </v-card-text>
        </v-card>

        <ListaIncidencias 
          :incidencias="incidenciasPaginadas" 
          @abrir-detalle="abrirDetalleIncidencia"
        />
        
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          @input="obtenerIncidencias"
          class="my-4"
        ></v-pagination>
      </v-container>
    </v-main>

    <v-btn
      fab
      :color="theme.colors.secondary"
      fixed
      bottom
      right
      @click="mostrarFormulario = true"
      class="floating-btn"
      elevation="8"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <v-dialog v-model="mostrarFormulario" max-width="600px" class="dialog-sobre-boton">
      <ReportarIncidencia 
        v-model="mostrarFormulario"
        :ubicacionSeleccionada="ubicacionSeleccionada"
        @incidencia-creada="incidenciaCreada"
      />
    </v-dialog>

    <ImageModal ref="imageModal" />

    <v-snackbar v-model="mostrarMensajeExito" :timeout="3000" color="success">
      {{ mensajeExito }}
    </v-snackbar>

    <DetalleIncidencia 
      v-if="incidenciaSeleccionada" 
      :incidencia="incidenciaSeleccionada"
      v-model="mostrarDetalleIncidencia"
      @cerrar="cerrarDetalleIncidencia"
    />
  </v-app>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
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
    const mostrarDetalleIncidencia = ref(false)
    const theme = useTheme()

    // Definir un tema personalizado más moderno
    theme.global.name.value = 'myCustomTheme'
    theme.themes.value.myCustomTheme = {
      dark: false,
      colors: {
        background: '#F5F5F5',
        surface: '#FFFFFF',
        primary: '#392763',
        'primary-darken-1': '#1976D2',
        secondary: '#573b96',
        'secondary-darken-1': '#E91E63',
        error: '#FF9AA2',
        info: '#B5E5EF',
        success: '#C7EFCF',
        warning: '#FFE5B4',
      },
    }

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
      mensajeExito.value = 'Incidencia añadida con xito'
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
      mostrarDetalleIncidencia.value = true;
    }

    const cerrarDetalleIncidencia = () => {
      incidenciaSeleccionada.value = null;
      mostrarDetalleIncidencia.value = false;
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
      mostrarMensajeExito,
      mostrarDetalleIncidencia,
      cerrarDetalleIncidencia,
      theme: computed(() => theme.current.value),
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

.floating-btn {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 99 !important;
  width: 64px !important;
  height: 64px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  transition: all 0.3s ease !important;
}

.floating-btn:hover {
  transform: scale(1.1) !important;
}

.floating-btn .v-btn__content {
  height: 100% !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 24px !important;
}

/* Estilos adicionales para un aspecto más moderno */
.v-card {
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.v-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
}

.v-toolbar-title {
  letter-spacing: 1px !important;
  text-align: center !important;
  width: 100% !important;
}
</style>