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
      return new Date(dateString).toLocaleString();
    };

    onMounted(() => {
      const map = L.map('mapa-detalle').setView([props.incidencia.latitud, props.incidencia.longitud], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19
      }).addTo(map);
      L.marker([props.incidencia.latitud, props.incidencia.longitud]).addTo(map);
    });

    return {
      cerrar,
      abrirImagenCompleta,
      formatDate
    };
  }
};
</script>