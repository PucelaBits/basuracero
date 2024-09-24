<template>
  <v-container fluid>
    <v-row>
      <v-col
        v-for="incidencia in incidencias"
        :key="incidencia.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card @click="abrirDetalle(incidencia)" class="ma-2">
          <v-img
            :src="incidencia.imagen"
            :alt="incidencia.tipo"
            height="200"
            cover
            @error="handleImageError"
          >
            <v-chip
              class="ma-2 tipo-chip"
              label
              text-color="primary"
              elevation="2"
            >
              {{ incidencia.tipo }}
            </v-chip>
          </v-img>
          <v-card-text>
            <p class="text-body-2 mb-2 descripcion-truncada">
              {{ incidencia.descripcion }}
            </p>
            <v-divider class="my-2"></v-divider>
            <v-row no-gutters align="center" class="text-caption text--secondary">
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
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref } from 'vue';
import DetalleIncidencia from './DetalleIncidencia.vue';
import { useRouter } from 'vue-router'

export default {
  name: 'ListaIncidencias',
  components: {
    DetalleIncidencia
  },
  emits: ['incidencia-seleccionada'],
  props: {
    incidencias: {
      type: Array,
      required: true
    }
  },
  setup(props, { emit }) {
    const router = useRouter();
    const incidenciaSeleccionada = ref(null);

    const abrirDetalle = (incidencia) => {
      emit('incidencia-seleccionada', incidencia);
      router.push({ name: 'DetalleIncidencia', params: { id: incidencia.id } });
    };

    const cerrarDetalle = () => {
      incidenciaSeleccionada.value = null;
    };

    const handleImageError = (e) => {
      e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
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
.v-card {
  transition: transform 0.3s;
}

.v-card:hover {
  transform: translateY(-5px);
}

.tipo-chip {
  color: #333;
  background-color: #fff;
  opacity: 1 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.descripcion-truncada {
  height: 3em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.text-caption {
  color: #666;
}
</style>