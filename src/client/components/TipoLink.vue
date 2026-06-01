<template>
  <RouterLink
    v-if="hasTipo"
    :to="to"
    class="tipo-link"
    :title="tipo"
    @click.stop="handleNavigate"
  >
    <v-icon
      v-if="icono"
      :size="iconSize"
      class="mr-1"
    >
      {{ icono }}
    </v-icon>
    <span>{{ label }}</span>
  </RouterLink>
  <span
    v-else
    class="tipo-link"
    :title="tipo"
  >
    <v-icon
      v-if="icono"
      :size="iconSize"
      class="mr-1"
    >
      {{ icono }}
    </v-icon>
    <span>{{ label }}</span>
  </span>
</template>

<script>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { buildTipoRoute } from '@/utils/tipoRoutes'

export default {
  name: 'TipoLink',
  components: {
    RouterLink
  },
  emits: ['navigate'],
  props: {
    tipoId: {
      type: [Number, String],
      default: null
    },
    tipo: {
      type: String,
      required: true
    },
    icono: {
      type: String,
      default: ''
    },
    iconSize: {
      type: [String, Number],
      default: 'small'
    },
    maxLength: {
      type: Number,
      default: 0
    }
  },
  setup(props, { emit }) {
    const hasTipo = computed(() => Number.isInteger(Number.parseInt(props.tipoId, 10)))
    const to = computed(() => buildTipoRoute(props.tipoId, props.tipo))
    const label = computed(() => {
      if (!props.maxLength || props.tipo.length <= props.maxLength) {
        return props.tipo
      }

      return `${props.tipo.slice(0, props.maxLength)}...`
    })
    const handleNavigate = () => {
      emit('navigate')
    }

    return {
      hasTipo,
      to,
      label,
      handleNavigate
    }
  }
}
</script>

<style scoped>
.tipo-link {
  align-items: center;
  color: inherit;
  display: inline-flex;
  min-height: 24px;
  text-decoration: none;
}

.tipo-link:hover {
  text-decoration: underline;
}
</style>
