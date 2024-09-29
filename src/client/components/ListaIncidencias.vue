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
        <v-card @click="abrirDetalle(incidencia)" class="ma-1">
          <v-carousel
            v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
            height="200"
            hide-delimiter-background
            :show-arrows="false"
            :continuous="false"
            :cycle="incidencia.imagenes.length > 1"
            :hide-delimiters="incidencia.imagenes.length <= 1"
          >
            <v-carousel-item
              v-for="(imagen, i) in incidencia.imagenes"
              :key="i"
              :src="imagen.ruta_imagen"
              cover
            >
              <v-chip
                class="ma-2 tipo-chip"
                label
                text-color="primary"
                elevation="2"
              >
                {{ incidencia.tipo }}
              </v-chip>
            </v-carousel-item>
          </v-carousel>
          <v-card-text>
            <v-row no-gutters align="center" class="text-caption text--secondary mb-1 mt-0">
              <v-col cols="auto">
                <v-icon small class="mr-1 mb-1">mdi-map-marker</v-icon>
                {{ incidencia.direccion.split(',').slice(0, 2).join(',') }}
              </v-col>
            </v-row>
            <p class="text-body-3 mb-2 ml-6 descripcion-truncada">
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

.v-carousel {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  overflow: hidden;
}

.tipo-chip {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
}

.v-carousel__controls__item {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.v-carousel__controls__item:first-child {
  left: 5px;
}

.v-carousel__controls__item:last-child {
  right: 5px;
}

.v-carousel .v-btn--icon {
  background-color: rgba(255, 255, 255, 0.7) !important;
}
</style>