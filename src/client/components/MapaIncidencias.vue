<template>
  <div class="mapa-container">
    <div ref="mapContainer" class="mapa-incidencias"></div>
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
        <v-icon>mdi-magnify</v-icon>
      </button>
    </div>
    <button @click="detectarUbicacion" class="boton-ubicacion">
      <v-icon>mdi-map-marker</v-icon>
    </button>
  </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import L from 'leaflet'
import { useRouter } from 'vue-router'

// Extensión para animación suave de marcadores
L.Marker.include({
  slideTo: function (latlng, options) {
    const duration = options.duration || 1000
    const keepAtCenter = options.keepAtCenter || false

    const start = this.getLatLng()
    const end = L.latLng(latlng)

    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime
      if (elapsedTime < duration) {
        const t = elapsedTime / duration
        const lat = start.lat + (end.lat - start.lat) * t
        const lng = start.lng + (end.lng - start.lng) * t
        const newLatLng = L.latLng(lat, lng)

        this.setLatLng(newLatLng)

        if (keepAtCenter) {
          this._map.setView(newLatLng, this._map.getZoom(), { animate: false })
        }

        requestAnimationFrame(animate)
      } else {
        this.setLatLng(end)
        if (keepAtCenter) {
          this._map.setView(end, this._map.getZoom(), { animate: false })
        }
      }
    }

    requestAnimationFrame(animate)
  }
})

// Extensión para animación suave de círculos
L.Circle.include({
  slideTo: function (latlng, options) {
    const duration = options.duration || 1000

    const start = this.getLatLng()
    const end = L.latLng(latlng)

    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime
      if (elapsedTime < duration) {
        const t = elapsedTime / duration
        const lat = start.lat + (end.lat - start.lat) * t
        const lng = start.lng + (end.lng - start.lng) * t
        const newLatLng = L.latLng(lat, lng)

        this.setLatLng(newLatLng)

        requestAnimationFrame(animate)
      } else {
        this.setLatLng(end)
      }
    }

    requestAnimationFrame(animate)
  }
})

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
    },
    ubicacionUsuario: {
      type: Object,
      default: null
    },
    seguirUsuario: {
      type: Boolean,
      default: false
    },
    deshabilitarNuevaIncidencia: {
      type: Boolean,
      default: false
    }
  },
  emits: ['ubicacion-seleccionada', 'abrir-formulario', 'incidencia-seleccionada', 'solicitar-actualizacion-ubicacion'],
  setup(props, { emit }) {
    const router = useRouter();
    const mapContainer = ref(null)
    let map = null
    let markers = []
    let tempMarker = null
    let userMarker = null
    let userCircle = null
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
      if (mapContainer.value && !map) {
        map = L.map(mapContainer.value).setView([41.652251, -4.724532], 13)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map)

        map.on('click', (event) => {
          addTempMarker(event.latlng.lat, event.latlng.lng)
        })

        if (props.seguirUsuario && props.ubicacionUsuario) {
          map.setView([props.ubicacionUsuario.latitud, props.ubicacionUsuario.longitud], 16)
        }
      }
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
      
      if (!props.deshabilitarNuevaIncidencia) {
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
    }

    const updateMarkers = () => {
      if (map && props.incidencias) {
        // Limpiar marcadores existentes
        markers.forEach(marker => map.removeLayer(marker))
        markers = []

        // Añadir nuevos marcadores
        props.incidencias.forEach(incidencia => {
          if (props.incluirSolucionadas || incidencia.estado !== 'solucionada') {
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
                <div class="popup-direccion popup-footer text-left"><span><i class="mdi mdi-map-marker"></i> ${incidencia.direccion.split(',').slice(0, 2).join(',')}</span></div>
                <p class="popup-description mt-2">${incidencia.descripcion}</p>
                <div class="popup-footer">
                  <span><i class="mdi mdi-account"></i> ${incidencia.nombre}</span>
                  <span><i class="mdi mdi-calendar"></i> ${formatDate(incidencia.fecha, true)}</span>
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
          map.setView([result.lat, result.lon], 16)
          addTempMarker(result.lat, result.lon)
        } else {
          console.log('No se encontraron resultados')
        }
      } catch (error) {
        console.error('Error al buscar dirección:', error)
      }
    }

    const watchId = ref(null)
    const lastPosition = ref(null)
    const lastUpdateTime = ref(0)

    const startWatchingUserLocation = () => {
      if (props.seguirUsuario && "geolocation" in navigator) {
        watchId.value = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            const newPosition = { latitud: latitude, longitud: longitude }
            const currentTime = Date.now()
            
            // Verificar si la posición ha cambiado significativamente o si han pasado 10 segundos
            if (!lastPosition.value || 
                calculateDistance(lastPosition.value, newPosition) > 10 ||
                currentTime - lastUpdateTime.value >= 10000) {
              lastPosition.value = newPosition
              lastUpdateTime.value = currentTime
              emit('solicitar-actualizacion-ubicacion', newPosition)
              updateUserLocation(newPosition)
            }
          },
          (error) => {
            console.error("Error al obtener la ubicación:", error.message)
          },
          { 
            enableHighAccuracy: true, 
            timeout: 5000, 
            maximumAge: 0
          }
        )

        // Forzar actualización cada 10 segundos
        const forceUpdateInterval = setInterval(() => {
          if (lastPosition.value && Date.now() - lastUpdateTime.value >= 10000) {
            emit('solicitar-actualizacion-ubicacion', lastPosition.value)
            updateUserLocation(lastPosition.value)
            lastUpdateTime.value = Date.now()
          }
        }, 10000)

        // Limpiar el intervalo cuando se desmonte el componente
        onUnmounted(() => {
          clearInterval(forceUpdateInterval)
        })
      }
    }

    const calculateDistance = (pos1, pos2) => {
      // Implementar cálculo de distancia entre dos puntos
      // Puedes usar la fórmula de Haversine para mayor precisión
      const R = 6371e3; // Radio de la Tierra en metros
      const φ1 = pos1.latitud * Math.PI/180;
      const φ2 = pos2.latitud * Math.PI/180;
      const Δφ = (pos2.latitud - pos1.latitud) * Math.PI/180;
      const Δλ = (pos2.longitud - pos1.longitud) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c;
    }

    const updateUserLocation = (newPosition) => {
      if (map && newPosition && props.seguirUsuario) {
        const { latitud, longitud } = newPosition
        const newLatLng = L.latLng(latitud, longitud)
        
        if (!userMarker) {
          userMarker = L.marker(newLatLng, {
            icon: L.divIcon({
              className: 'user-location-marker',
              html: '<div class="user-location-dot"></div>'
            })
          }).addTo(map)
          
          userCircle = L.circle(newLatLng, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            radius: 50
          }).addTo(map)

          map.setView(newLatLng, 16, { animate: true, duration: 1 })
        } else {
          userMarker.setLatLng(newLatLng)
          userCircle.setLatLng(newLatLng)
          map.setView(newLatLng, 16, { animate: true, duration: 1 })
        }
      }
    }

    const removeUserMarker = () => {
      if (userMarker) {
        map.removeLayer(userMarker)
        userMarker = null
      }
      if (userCircle) {
        map.removeLayer(userCircle)
        userCircle = null
      }
    }

    const stopWatchingUserLocation = () => {
      if (watchId.value !== null) {
        navigator.geolocation.clearWatch(watchId.value)
        watchId.value = null
      }
    }

    onMounted(() => {
      initMap()
      updateMarkers()
      if (props.seguirUsuario) {
        startWatchingUserLocation()
      }
    })

    onUnmounted(() => {
      if (map) {
        map.remove()
        map = null
      }
      stopWatchingUserLocation()
    })

    watch(() => props.incidencias, updateMarkers, { deep: true })
    watch(() => props.incluirSolucionadas, updateMarkers)
    watch(() => props.ubicacionSeleccionada, (newUbicacion) => {
      if (newUbicacion.latitud && newUbicacion.longitud) {
        updateUbicacion(newUbicacion.latitud, newUbicacion.longitud)
      }
    })
    watch(() => props.ubicacionUsuario, (newValue) => {
      if (newValue && props.seguirUsuario) {
        updateUserLocation(newValue)
      }
    })
    watch(() => props.seguirUsuario, (newValue) => {
      if (newValue) {
        startWatchingUserLocation()
      } else {
        stopWatchingUserLocation()
        removeUserMarker()
      }
    })

    return {
      mapContainer,
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

.popup-direccion {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popup-description {
  font-size: 14px;
  line-height: 1;
  margin-bottom: 10px;
  margin-top: 1px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.user-location-marker {
  width: 20px;
  height: 20px;
}

.user-location-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #3388ff;
  border: 2px solid white;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}
</style>