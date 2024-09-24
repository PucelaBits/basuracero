<template>
  <div class="mapa-container">
    <div id="map" class="mapa-incidencias"></div>
    <div class="search-container" :class="{ 'active': isSearchActive }">
      <input 
        type="text" 
        id="search-input" 
        placeholder="Buscar dirección..." 
        v-model="searchQuery" 
        v-show="isSearchActive"
        @keyup.enter="searchAddress"
      >
      <button class="search-button" @click="toggleSearch">
        <i class="fas fa-search"></i>
      </button>
    </div>
    <button @click="detectarUbicacion" class="boton-ubicacion">
      <i class="fas fa-crosshairs"></i>
    </button>
  </div>
</template>

<script>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import L from 'leaflet'
import { useRouter } from 'vue-router'

export default {
  name: 'MapaIncidencias',
  props: {
    incidencias: {
      type: Array,
      required: true
    },
    incluirSolucionadas: {
      type: Boolean,
      default: false
    },
    ubicacionSeleccionada: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['ubicacion-seleccionada', 'abrir-formulario', 'incidencia-seleccionada'],
  setup(props, { emit }) {
    const router = useRouter();
    let map = null
    let markers = []
    let tempMarker = null
    const isSearchActive = ref(false)
    const searchQuery = ref('')
    const searchResults = ref([])
    
    const incidenciaSeleccionada = ref(null);

    const abrirDetalle = (incidencia) => {
      emit('incidencia-seleccionada', incidencia);
      router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } });
    };

    const formatDate = (dateString, onlyDate = false) => {
      const date = new Date(dateString);
      const options = onlyDate 
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
    };

    const truncateText = (text, maxLength) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    };

    const initMap = () => {
      map = L.map('map').setView([41.652251, -4.724532], 13)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map)

      map.on('click', (event) => {
        addTempMarker(event.latlng.lat, event.latlng.lng)
      })
    }

    const addTempMarker = (lat, lng) => {
      if (tempMarker) {
        map.removeLayer(tempMarker)
      }
      tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        })
      }).addTo(map)
      const popupContent = L.DomUtil.create('div')
      const addButton = L.DomUtil.create('button', 'add-incidencia-btn', popupContent)
      addButton.innerHTML = 'Añadir incidencia aquí'
      L.DomEvent.on(addButton, 'click', () => {
        emit('ubicacion-seleccionada', { latitud: lat, longitud: lng })
        emit('abrir-formulario')
      })
      tempMarker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-popup-class'
      }).openPopup()
    }

    const updateMarkers = () => {
      markers.forEach(marker => map.removeLayer(marker))
      markers = []

      props.incidencias.forEach(incidencia => {
        if (incidencia.estado === 'activa' || (incidencia.estado === 'solucionada' && props.incluirSolucionadas)) {
          const popupContent = L.DomUtil.create('div', 'custom-popup')
          
          popupContent.innerHTML = `
            <div class="popup-header">
              <img src="${incidencia.imagen}" alt="${incidencia.tipo}" class="popup-image">
              <div class="popup-chips">
                <span class="popup-chip" title="${incidencia.tipo}">${truncateText(incidencia.tipo, 16)}</span>
                <span class="estado-pastilla ${incidencia.estado}">${incidencia.estado === 'activa' ? 'Activa' : 'Solucionada'}</span>
              </div>
            </div>
            <div class="popup-content">
              <p class="popup-description">${incidencia.descripcion}</p>
              <div class="popup-footer">
                <span><i class="fas fa-user"></i> ${incidencia.nombre}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(incidencia.fecha, true)}</span>
              </div>
            </div>
          `

          const marker = L.marker([incidencia.latitud, incidencia.longitud], {
            icon: createCustomIcon(incidencia.estado)
          }).addTo(map)

          marker.bindPopup(popupContent, { 
            maxWidth: 250, 
            minWidth: 250,
            className: 'custom-popup-class' 
          })

          L.DomEvent.on(popupContent.querySelector('.popup-image'), 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            abrirDetalle(incidencia);
          })

          markers.push(marker)
        }
      })

      if (markers.length > 0) {
        const bounds = L.latLngBounds(markers.map(marker => marker.getLatLng()))
        map.fitBounds(bounds)
      }
    }

    const createCustomIcon = (estado) => {
      const color = estado === 'activa' ? '#c30b82' : '#27ae60'
      return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:${color};' class='marker-pin'></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })
    }
    
    const updateUbicacion = (lat, lng) => {
      if (map) {
        map.setView([lat, lng], 18)
        addTempMarker(lat, lng)
      }
    }

    const detectarUbicacion = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            updateUbicacion(latitude, longitude)
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message)
            alert("No se pudo obtener la ubicación. Por favor, intente de nuevo.")
          }
        )
      } else {
        alert("La geolocalización no está disponible en este navegador.")
      }
    }

    const removeTempMarker = () => {
      if (tempMarker) {
        map.removeLayer(tempMarker)
        tempMarker = null
      }
    }

    const toggleSearch = () => {
      if (isSearchActive.value) {
        searchAddress()
      } else {
        isSearchActive.value = true
      }
    }

    const searchAddress = async () => {
      if (searchQuery.value.length < 3) return
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}+Valladolid+España&limit=5`)
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const result = data[0]
          map.setView([result.lat, result.lon], 17)
          addTempMarker(result.lat, result.lon)
        } else {
          console.log('No se encontraron resultados')
        }
      } catch (error) {
        console.error('Error al buscar dirección:', error)
      }
    }

    onMounted(() => {
      initMap()
      updateMarkers()
    })

    onUnmounted(() => {
      if (map) {
        map.remove()
      }
    })

    watch(() => props.incidencias, updateMarkers, { deep: true })
    watch(() => props.incluirSolucionadas, updateMarkers)
    watch(() => props.ubicacionSeleccionada, (newUbicacion) => {
      if (newUbicacion.latitud && newUbicacion.longitud) {
        updateUbicacion(newUbicacion.latitud, newUbicacion.longitud)
      }
    })

    return {
      updateUbicacion,
      detectarUbicacion,
      removeTempMarker,
      isSearchActive,
      searchQuery,
      toggleSearch,
      searchAddress,
      abrirDetalle
    }
  }
}
</script>

<style>
.mapa-container {
  position: relative;
  height: 50vh;
  width: 100%;
}

.mapa-incidencias {
  height: 100%;
  width: 100%;
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.boton-ubicacion {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background-color: white;
  border: 2px solid rgba(0,0,0,0.2);
  border-radius: 4px;
  width: 34px;
  height: 34px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 1px 5px rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
}

.boton-ubicacion:hover {
  background-color: #f4f4f4;
}

.custom-div-icon {
  background: none;
  border: none;
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

.custom-popup {
  padding: 0;
}

.popup-header {
  position: relative;
  width: 100%;
}

.popup-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.popup-chips {
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

.popup-content {
  padding: 10px;
}

.popup-description {
  font-size: 14px;
  line-height: 1;
  margin-bottom: 10px;
  margin-top: 1px !important;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.popup-footer i {
  margin-right: 5px;
}

.leaflet-popup-content-wrapper {
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
}

.leaflet-popup-content {
  margin: 0;
  width: 100%;
}

.leaflet-popup-tip-container {
  display: none;
}

.add-incidencia-btn {
  background-color: #7361a0;
  color: white;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
  text-align: center;
  box-sizing: border-box;
  margin: 0;
  display: block;
}

.add-incidencia-btn:hover {
  background-color: #5a4a8a;
}

.custom-popup-class {
  padding: 0;
}

.custom-popup-class .leaflet-popup-content-wrapper {
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
}

.custom-popup-class .leaflet-popup-content {
  margin: 0;
  width: 100%;
}

.custom-popup {
  width: 100%;
}

.search-container {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-container.active {
  width: 240px;
}

#search-input {
  flex-grow: 1;
  padding: 8px;
  border: none;
  border-radius: 4px 0 0 4px;
  font-size: 14px;
  margin: 0;
}

.search-button {
  background-color: #fff;
  border: none;
  border-radius: 0 4px 4px 0;
  padding: 8px 12px;
  cursor: pointer;
}

.search-button:hover {
  background-color: #f4f4f4;
}

.custom-popup .popup-image {
  cursor: pointer;
}

.custom-popup .popup-content {
  position: relative;
  padding-bottom: 20px;
}
</style>