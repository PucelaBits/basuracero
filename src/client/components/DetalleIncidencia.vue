<template>
  <div class="detalle-incidencia-overlay" @click="cerrar">
    <div class="detalle-incidencia-contenido" @click.stop>
      <img :src="incidencia.imagen" :alt="incidencia.tipo" class="imagen-detalle" @click="abrirImagenCompleta" />
      <div class="detalle-contenido">
        <button class="cerrar-btn" @click="cerrar">X</button>
        <h2>{{ incidencia.tipo }}</h2>
        <p>{{ incidencia.descripcion }}</p>
        <div class="meta-info">
          <p><strong>Enviado por:</strong> {{ incidencia.nombre }}</p>
          <p><strong>Fecha:</strong> {{ formatDate(incidencia.fecha) }}</p>
        </div>
        <div id="mapa-detalle" class="mapa-detalle"></div>
        <!-- Añade esta sección para mostrar la dirección -->
        <div v-if="incidencia.direccion" class="direccion-info">
          <p><strong>Dirección:</strong> {{ incidencia.direccion }}</p>
        </div>
        <div class="estado-incidencia">
          <p><strong>Estado:</strong> {{ incidencia.estado === 'activa' ? 'Activa' : 'Solucionada' }}</p>
          <p v-if="incidencia.estado === 'solucionada'">
            <strong>Fecha de solución:</strong> {{ formatDate(incidencia.fecha_solucion) }}
          </p>
          <p v-if="incidencia.reportes_solucion > 0">
            {{ incidencia.reportes_solucion }} personas han indicado que está solucionado
          </p>
        </div>
        <div class="acciones-incidencia">
          <v-btn
            v-if="incidencia.estado === 'activa'"
            @click="mostrarDialogoConfirmacion = true"
            :loading="reportando"
            :disabled="reportando"
            color="success"
            class="btn-accion"
          >
            {{ reportando ? 'Reportando...' : 'Reportar como solucionada' }}
          </v-btn>
          <a 
            href="https://www.valladolid.es/es/sqi#proxia-restful-sqi.1.1/p!/new" 
            target="_blank" 
            rel="noopener noreferrer"
            class="btn-accion btn-queja-ayuntamiento"
          >
            Enviar queja al ayuntamiento
          </a>
        </div>
      </div>
    </div>

    <!-- Diálogo de confirmación -->
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

    <!-- Diálogo de advertencia -->
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
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VBtn, VDialog, VCard, VCardTitle, VCardText, VCardActions, VSpacer } from 'vuetify/components';

export default {
  name: 'DetalleIncidencia',
  props: {
    incidencia: {
      type: Object,
      required: true
    }
  },
  emits: ['cerrar'],
  setup(props, { emit }) {
    const cerrar = () => {
      emit('cerrar');
    };

    const abrirImagenCompleta = () => {
      window.openImageModal(props.incidencia.imagen);
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
    };

    const reportando = ref(false);
    const mostrarDialogoConfirmacion = ref(false);
    const mostrarDialogoAdvertencia = ref(false);

    const confirmarSolucion = () => {
      mostrarDialogoConfirmacion.value = false;
      reportarComoSolucionada();
    };

    // Añadir esta nueva función
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
      const map = L.map('mapa-detalle').setView([props.incidencia.latitud, props.incidencia.longitud], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19
      }).addTo(map);
      
      // Nuevo código para el marcador personalizado
      L.marker([props.incidencia.latitud, props.incidencia.longitud], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        })
      }).addTo(map);
    });

    return {
      cerrar,
      abrirImagenCompleta,
      formatDate,
      reportarComoSolucionada,
      reportando,
      mostrarDialogoConfirmacion,
      mostrarDialogoAdvertencia,
      confirmarSolucion,
      cancelarConfirmacion // Añadir esta nueva función al return
    };
  }
};
</script>

<style scoped>
/* Añade estos estilos para el marcador personalizado */
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

.btn-reportar-solucionada {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.btn-reportar-solucionada:hover {
  background-color: #2ecc71;
}

.btn-reportar-solucionada:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.estado-incidencia {
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
}

.direccion-info {
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
}

.direccion-info p {
  margin: 0;
  font-size: 0.9em;
}

.acciones-incidencia {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.btn-accion {
  width: 100%;
  padding: 10px 0px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  text-align: center;
  white-space: normal;
  word-wrap: break-word;
}

.btn-reportar-solucionada {
  background-color: #27ae60;
  color: white;
  border: none;
}

.btn-reportar-solucionada:hover {
  background-color: #2ecc71;
}

.btn-reportar-solucionada:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-queja-ayuntamiento {
  background-color: #392763c4;
  color: white;
  border: none;
}

.btn-queja-ayuntamiento:hover {
  background-color: #533d85c4;
}

@media (min-width: 768px) {
  .acciones-incidencia {
    flex-direction: row;
  }

  .btn-accion {
    flex: 1;
  }
}
</style>