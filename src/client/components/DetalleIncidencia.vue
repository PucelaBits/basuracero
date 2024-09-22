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
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
      formatDate
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
</style>