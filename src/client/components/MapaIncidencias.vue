<template>
  <div class="mapa-container">
    <div id="map" class="mapa-incidencias"></div>
    <button @click="detectarUbicacion" class="boton-ubicacion">
      <i class="fas fa-crosshairs"></i>
    </button>
  </div>
</template>

<script>
import { onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'

export default {
  name: 'MapaIncidencias',
  props: {
    incidencias: {
      type: Array,
      required: true
    },
    ubicacionSeleccionada: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['ubicacion-seleccionada', 'abrir-formulario'],
  setup(props, { emit }) {
    let map = null
    let markers = []
    let tempMarker = null

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
      tempMarker.bindPopup(popupContent).openPopup()
    }

    const updateMarkers = () => {
      markers.forEach(marker => map.removeLayer(marker))
      markers = []

      props.incidencias.forEach(incidencia => {
        const popupContent = `
          <div class="custom-popup">
            <img src="${incidencia.imagen}" alt="${incidencia.tipo}" class="popup-image" onclick="window.openImageModal('${incidencia.imagen}')" onerror="this.onerror=null;this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';">
            <div class="popup-content">
              <h3>${incidencia.tipo}</h3>
              <p>${incidencia.descripcion}</p>
              <small>Enviado por: ${incidencia.nombre}</small>
              <small>Fecha: ${new Date(incidencia.fecha).toLocaleString()}</small>
            </div>
          </div>
        `
        const marker = L.marker([incidencia.latitud, incidencia.longitud], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          })
        })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 300, className: 'custom-popup-class' })
        markers.push(marker)
      })

      if (props.incidencias.length > 0) {
        const bounds = L.latLngBounds(props.incidencias.map(i => [i.latitud, i.longitud]))
        map.fitBounds(bounds)
      }
    }

    const updateUbicacion = (lat, lng) => {
      if (map) {
        map.setView([lat, lng], 15)
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

    onMounted(() => {
      initMap()
      updateMarkers()
    })

    onUnmounted(() => {
      if (map) {
        map.remove()
      }
    })

    watch(() => props.incidencias, () => {
      updateMarkers()
      removeTempMarker()
    }, { deep: true })

    watch(() => props.ubicacionSeleccionada, (newUbicacion) => {
      if (newUbicacion.latitud && newUbicacion.longitud) {
        updateUbicacion(newUbicacion.latitud, newUbicacion.longitud)
      }
    })

    return {
      updateUbicacion,
      detectarUbicacion,
      removeTempMarker
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

.custom-popup {
  padding: 0;
}

.popup-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-bottom: 0;
}

.popup-content {
  padding: 10px;
}

.leaflet-popup-content-wrapper {
  padding: 0;
}

.leaflet-popup-content {
  margin: 0;
  width: 100% !important;
}

.add-incidencia-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
  text-align: center;
}

.add-incidencia-btn:hover {
  background-color: #2980b9;
}

.custom-popup-class {
  padding: 0;
}

.custom-popup-class .leaflet-popup-content-wrapper {
  padding: 0;
  overflow: hidden;
}

.custom-popup-class .leaflet-popup-content {
  margin: 0;
  width: 100% !important;
}

.custom-popup {
  width: 100%;
}

.popup-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.popup-content {
  padding: 10px;
}

.popup-content h3 {
  margin-top: 0;
  margin-bottom: 5px;
}

.popup-content p {
  margin-bottom: 5px;
}

.popup-content small {
  display: block;
  color: #666;
}
</style>