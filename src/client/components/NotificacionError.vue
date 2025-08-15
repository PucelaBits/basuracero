<template>
  <v-snackbar
    v-model="mostrar"
    :timeout="timeout"
    :color="color"
    :location="location"
    variant="tonal"
    class="notificacion-error"
  >
    <div class="d-flex align-center">
      <v-icon :icon="icono" class="mr-2" />
      <span>{{ mensaje }}</span>
    </div>
    
    <template v-slot:actions>
      <v-btn
        v-if="accion"
        :disabled="accionDeshabilitada" 
        size="small"
        variant="text"
        @click="onAccion"
      >
        {{ accion }}
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        @click="cerrar"
      >
        Cerrar
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  // Si la notificación está visible
  modelValue: {
    type: Boolean,
    default: false
  },
  // Mensaje a mostrar
  mensaje: {
    type: String,
    default: ''
  },
  // Tipo de notificación (error, warning, success, info)
  tipo: {
    type: String,
    default: 'error',
    validator: (value) => ['error', 'warning', 'success', 'info'].includes(value)
  },
  // Duración en ms (0 = no se cierra automáticamente)
  duracion: {
    type: Number,
    default: 5000
  },
  // Posición de la notificación
  posicion: {
    type: String,
    default: 'bottom',
    validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  // Texto del botón de acción (opcional)
  accion: {
    type: String,
    default: ''
  },
  // Si la acción está deshabilitada
  accionDeshabilitada: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'accion']);

// Estado local
const mostrar = ref(props.modelValue);

// Mapear tipo a color
const color = computed(() => {
  switch (props.tipo) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'success': return 'success';
    case 'info': return 'info';
    default: return 'error';
  }
});

// Mapear tipo a icono
const icono = computed(() => {
  switch (props.tipo) {
    case 'error': return 'mdi-alert-circle-outline';
    case 'warning': return 'mdi-alert-outline';
    case 'success': return 'mdi-check-circle-outline';
    case 'info': return 'mdi-information-outline';
    default: return 'mdi-alert-circle-outline';
  }
});

// Mapear posición a location
const location = computed(() => {
  return props.posicion;
});

// Timeout
const timeout = computed(() => {
  return props.duracion;
});

// Cuando el modelValue cambia, actualizamos el estado local
watch(() => props.modelValue, (newValue) => {
  mostrar.value = newValue;
});

// Cuando el estado local cambia, emitimos el evento
watch(mostrar, (newValue) => {
  emit('update:modelValue', newValue);
});

// Función para cerrar la notificación
const cerrar = () => {
  mostrar.value = false;
};

// Función para manejar la acción
const onAccion = () => {
  emit('accion');
  // Dependiendo del uso, podemos cerrar automáticamente después de la acción
  // cerrar();
};
</script>

<style scoped>
.notificacion-error {
  border-radius: 8px;
}
</style>
