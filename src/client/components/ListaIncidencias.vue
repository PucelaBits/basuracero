<template>
  <div class="lista-incidencias">
    <div class="incidencias-grid">
      <div v-for="incidencia in incidencias" :key="incidencia.id" class="incidencia-card" @click="abrirDetalle(incidencia)">
        <div class="incidencia-imagen">
          <img :src="incidencia.imagen" :alt="incidencia.tipo" @error="handleImageError" />
        </div>
        <div class="incidencia-info">
          <h3>{{ incidencia.tipo }}</h3>
          <p class="incidencia-descripcion">{{ incidencia.descripcion }}</p>
          <div class="incidencia-meta">
            <small>Enviado por: {{ incidencia.nombre }}</small>
            <small>{{ formatDate(incidencia.fecha) }}</small>
          </div>
        </div>
      </div>
    </div>
    <DetalleIncidencia 
      v-if="incidenciaSeleccionada" 
      :incidencia="incidenciaSeleccionada" 
      @cerrar="cerrarDetalle"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import DetalleIncidencia from './DetalleIncidencia.vue';

export default {
  name: 'ListaIncidencias',
  components: {
    DetalleIncidencia
  },
  props: {
    incidencias: {
      type: Array,
      required: true
    }
  },
  setup() {
    const incidenciaSeleccionada = ref(null);

    const abrirDetalle = (incidencia) => {
      incidenciaSeleccionada.value = incidencia;
    };

    const cerrarDetalle = () => {
      incidenciaSeleccionada.value = null;
    };

    const handleImageError = (e) => {
      e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString();
    };

    return {
      incidenciaSeleccionada,
      abrirDetalle,
      cerrarDetalle,
      handleImageError,
      formatDate
    };
  }
};
</script>

<style scoped>
.lista-incidencias {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.incidencias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.incidencia-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.incidencia-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.incidencia-imagen {
  height: 150px;
  overflow: hidden;
}

.incidencia-imagen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.incidencia-info {
  padding: 1rem;
}

.incidencia-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #333;
}

.incidencia-descripcion {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.incidencia-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #999;
}
</style>