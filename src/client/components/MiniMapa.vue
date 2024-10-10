<template>
    <div class="mini-mapa-container">
      <div ref="mapContainer" class="mini-mapa"></div>
    </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import L from 'leaflet';

export default {
  name: 'MiniMapa',
  props: {
    latitud: {
      type: Number,
      required: true
    },
    longitud: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const mapContainer = ref(null);
    let map = null;
    let marker = null;

    const initMap = () => {
      if (mapContainer.value && !map) {
        map = L.map(mapContainer.value, {
          zoomControl: true,
          dragging: false,
          touchZoom: true,
          scrollWheelZoom: false,
          doubleClickZoom: true
        }).setView([props.latitud, props.longitud], 16);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
        
        marker = L.marker([props.latitud, props.longitud], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          })
        }).addTo(map);
      }
    };

    const updateMarker = () => {
      if (map && marker) {
        const newLatLng = L.latLng(props.latitud, props.longitud);
        marker.setLatLng(newLatLng);
        map.setView(newLatLng, 16);
      }
    };

    onMounted(() => {
      initMap();
    });

    watch(() => [props.latitud, props.longitud], updateMarker);

    onUnmounted(() => {
      if (map) {
        map.remove();
        map = null;
      }
    });

    return { mapContainer };
  }
}
</script>

<style scoped>
.mini-mapa-container {
    position: relative;
}

.mini-mapa {
  height: 250px;
  width: 100%;
}

.marker-pin {
  width: 20px;
  height: 20px;
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
  width: 14px;
  height: 14px;
  margin: 3px 0 0 3px;
  background: #fff;
  position: absolute;
  border-radius: 50%;
}
</style>