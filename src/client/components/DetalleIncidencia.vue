<template>
  <v-dialog v-model="dialog" fullscreen hide-overlay transition="dialog-bottom-transition">
    <v-card class="detalle-incidencia">
      <div class="imagen-container">
        <v-img
          :src="incidencia.imagen"
          :alt="incidencia.tipo"
          height="300"
          class="imagen-detalle"
          @click="abrirImagenCompleta"
          cover
        >
          <template v-slot:placeholder>
            <v-row class="fill-height ma-0" align="center" justify="center">
              <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
            </v-row>
          </template>
          
          <!-- Pastillas de tipo y estado -->
          <div class="pastillas-container">
            <span class="popup-chip" :title="incidencia.tipo">{{ truncateText(incidencia.tipo, 16) }}</span>
            <span :class="['estado-pastilla', incidencia.estado]">
              {{ incidencia.estado === 'activa' ? 'Activa' : 'Solucionada' }}
            </span>
          </div>
        </v-img>
        <v-btn icon dark class="close-btn" @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text class="flex-grow-1 overflow-y-auto pa-0">
        <v-container class="px-4 py-6">
          <v-card flat class="mb-6">
            <v-card-text class="text-body-1">
              {{ incidencia.descripcion }}
            </v-card-text>
          </v-card>

          <v-divider class="mb-3"></v-divider>

          <v-row align="center" class="text-caption text--secondary">
            <v-col cols="auto">
              <v-icon small class="mr-1">mdi-account</v-icon>
              {{ incidencia.nombre }}
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="auto">
              <v-icon small class="mr-1">mdi-calendar</v-icon>
              {{ formatDate(incidencia.fecha) }}
            </v-col>
          </v-row>

          <!-- Dirección -->
          <v-row v-if="incidencia.direccion" align="center" class="mt-2">
            <v-col cols="12">
              <div class="d-flex align-center text-caption">
                <v-icon small class="mr-1">mdi-map-marker</v-icon>
                <span>{{ incidencia.direccion }}</span>
              </div>
            </v-col>
          </v-row>

          <!-- Estado -->
          <v-row align="center" class="mt-2">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon :color="incidencia.estado === 'activa' ? 'error' : 'success'" small class="mr-1">
                  {{ incidencia.estado === 'activa' ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                </v-icon>
                <span :class="{ 'error--text': incidencia.estado === 'activa', 'success--text': incidencia.estado === 'solucionada' }">
                  {{ incidencia.estado === 'activa' ? 'Activa' : 'Solucionada' }}
                </span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.estado === 'solucionada'" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon color="success" small class="mr-1">mdi-check-circle</v-icon>
                <v-icon small class="mr-1">mdi-calendar</v-icon>
                <span>{{ formatDate(incidencia.fecha_solucion) }}</span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.reportes_solucion > 0" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon small class="mr-1">mdi-account-group</v-icon>
                <span>{{ incidencia.reportes_solucion }} personas han indicado que está solucionado</span>
              </div>
            </v-col>
          </v-row>
        </v-container>

        <!-- Mapa -->
        <div id="mapa-detalle" class="mapa-detalle mt-4"></div>
      </v-card-text>

      <v-card-actions class="flex-column">
        <v-btn
          v-if="incidencia.estado === 'activa'"
          @click="mostrarDialogoConfirmacion = true"
          :loading="reportando"
          :disabled="reportando"
          color="success"
          class="mb-2 w-100"
        >
          {{ reportando ? 'Reportando...' : 'Reportar como solucionada' }}
        </v-btn>
        <v-btn
          href="https://www.valladolid.es/es/sqi#proxia-restful-sqi.1.1/p!/new"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          class="w-100"
        >
          Enviar queja al ayuntamiento
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="mostrarDialogoConfirmacion" max-width="400px">
      <v-card>
        <v-card-title class="headline">Confirmar solución</v-card-title>
        <v-card-text>
          ¿Has comprobado presencialmente que está solucionada?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelarConfirmacion">
            No
          </v-btn>
          <v-btn color="green darken-1" text @click="confirmarSolucion">
            Sí
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

    <!-- Nuevo modal para la imagen a pantalla completa -->
    <v-dialog v-model="dialogImagen" fullscreen>
      <v-card>
        <v-toolbar dark color="#392763">
          <v-btn icon dark @click="dialogImagen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-0 d-flex align-center justify-center" style="height: calc(100vh - 64px);">
          <v-img
            :src="incidencia.imagen"
            :alt="incidencia.tipo"
            max-height="100%"
            max-width="100%"
            contain
          ></v-img>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import { onMounted, ref, watch } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default {
  name: 'DetalleIncidencia',
  props: {
    incidencia: {
      type: Object,
      required: true
    },
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'cerrar'],
  setup(props, { emit }) {
    const dialog = ref(props.modelValue);
    const reportando = ref(false);
    const mostrarDialogoConfirmacion = ref(false);
    const mostrarDialogoAdvertencia = ref(false);
    const dialogImagen = ref(false);

    watch(() => props.modelValue, (newValue) => {
      dialog.value = newValue;
    });

    watch(dialog, (newValue) => {
      emit('update:modelValue', newValue);
      if (!newValue) {
        emit('cerrar');
      }
    });

    const cerrar = () => {
      dialog.value = false;
    };

    const abrirImagenCompleta = () => {
      dialogImagen.value = true;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
    };

    const confirmarSolucion = () => {
      mostrarDialogoConfirmacion.value = false;
      reportarComoSolucionada();
    };

    const cancelarConfirmacion = () => {
      mostrarDialogoConfirmacion.value = false;
      mostrarDialogoAdvertencia.value = true;
    };

    const reportarComoSolucionada = async () => {
      reportando.value = true;
      try {
        const response = await axios.post(`/api/incidencias/${props.incidencia.id}/solucionada`);
        props.incidencia.reportes_solucion = response.data.reportes;
        if (response.data.reportes >= 3) {
          props.incidencia.estado = 'solucionada';
          props.incidencia.fecha_solucion = new Date().toISOString();
        }
      } catch (error) {
        console.error('Error al reportar como solucionada:', error);
        alert(error.response?.data?.error || 'Error al reportar como solucionada');
      } finally {
        reportando.value = false;
      }
    };

    const truncateText = (text, maxLength) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    };

    onMounted(() => {
      if (props.incidencia.latitud && props.incidencia.longitud) {
        const map = L.map('mapa-detalle').setView([props.incidencia.latitud, props.incidencia.longitud], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          maxZoom: 19
        }).addTo(map);
        
        L.marker([props.incidencia.latitud, props.incidencia.longitud], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          })
        }).addTo(map);
      }
    });

    return {
      dialog,
      cerrar,
      abrirImagenCompleta,
      formatDate,
      reportarComoSolucionada,
      reportando,
      mostrarDialogoConfirmacion,
      mostrarDialogoAdvertencia,
      confirmarSolucion,
      cancelarConfirmacion,
      dialogImagen,
      truncateText
    };
  }
};
</script>

<style scoped>
.detalle-incidencia {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.imagen-container {
  position: relative;
}

.imagen-detalle {
  width: 100%;
  height: 300px;
  object-fit: cover;
  cursor: pointer;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background-color: rgba(255, 255, 255, 0.5) !important;
}

.pastillas-container {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 5px;
}

.popup-chip {
  background-color: white;
  color: #392763;
  padding: 2px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.estado-pastilla {
  padding: 2px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
}

.estado-pastilla.activa {
  background-color: #e74c3c;
  color: white;
}

.estado-pastilla.solucionada {
  background-color: #2ecc71;
  color: white;
}

.mapa-detalle {
  height: 300px;
  width: 100%;
  margin-top: 20px;
}

/* Estilos para el marcador personalizado */
.custom-div-icon {
  background: none;
  border: none;
}

.marker-pin {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  background: #c30b82;
  position: absolute;
  transform: rotate(-45deg);
  left: 50%;
  top: 50%;
  margin: -15px 0 0 -15px;
}

.marker-pin::after {
  content: '';
  width: 24px;
  height: 24px;
  margin: 3px 0 0 3px;
  background: #fff;
  position: absolute;
  border-radius: 50%;
}

.v-card__text {
  flex-grow: 1;
  overflow-y: auto;
}

.v-card__actions {
  padding: 16px;
}

.w-100 {
  width: 100%;
}
</style>