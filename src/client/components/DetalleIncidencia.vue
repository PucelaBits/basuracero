<template>
  <v-dialog v-model="dialog" fullscreen hide-overlay transition="dialog-bottom-transition">
    <v-card class="detalle-incidencia">
      <v-toolbar dark color="#392763">
        <v-btn icon dark @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ incidencia.tipo }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text class="flex-grow-1 overflow-y-auto pa-0">
        <v-img
          :src="incidencia.imagen"
          :alt="incidencia.tipo"
          height="300"
          class="imagen-detalle"
          @click="abrirImagenCompleta"
          cover
        ></v-img>

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
        </v-container>

        <div id="mapa-detalle" class="mapa-detalle mt-4"></div>
        <v-sheet v-if="incidencia.direccion" color="grey lighten-3" class="pa-3 mt-4 rounded">
          <v-icon left>mdi-map-marker</v-icon>
          <span class="font-weight-medium">Dirección:</span> {{ incidencia.direccion }}
        </v-sheet>
        <v-alert :type="incidencia.estado === 'activa' ? 'warning' : 'success'" dense class="mt-4">
          <strong>Estado:</strong> {{ incidencia.estado === 'activa' ? 'Activa' : 'Solucionada' }}
          <div v-if="incidencia.estado === 'solucionada'">
            <strong>Fecha de solución:</strong> {{ formatDate(incidencia.fecha_solucion) }}
          </div>
          <div v-if="incidencia.reportes_solucion > 0">
            {{ incidencia.reportes_solucion }} personas han indicado que está solucionado
          </div>
        </v-alert>
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
      dialogImagen
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

.imagen-detalle {
  width: 100%;
  max-height: 50vh;
  object-fit: cover;
  cursor: pointer;
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