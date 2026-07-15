<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card class="tipos-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left class="mr-2">mdi-tag-multiple-outline</v-icon>
          Tipos
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-row class="text-body-2 mb-6 mt-2">
          <v-col cols="2" class="d-flex align-center justify-end">
            <v-icon>mdi-tag-text-outline</v-icon>
          </v-col>
          <v-col cols="10">
            Explora las categorías más activas y entra directamente al mapa filtrado de cada una.
          </v-col>
        </v-row>

        <p class="text-center mt-2 mb-4 text-grey tipos-resumen">
          <v-icon color="grey">mdi-tag-multiple-outline</v-icon>
          <span class="ml-2">{{ tiposUnicos }}</span>
          <v-icon color="grey" class="ml-4">mdi-file-document-multiple</v-icon>
          <span class="ml-2">{{ incidenciasActivas }}</span>
          <v-icon color="grey" class="ml-4">mdi-check-circle</v-icon>
          <span class="ml-2">{{ incidenciasSolucionadas }}</span>
        </p>

        <v-list class="tipos-list">
          <v-list-item
            v-for="tipo in tipos"
            :key="tipo.id"
            class="mb-2 rounded-lg elevation-1 tipo-list-item"
            @click="irATipo(tipo)"
          >
            <template v-slot:prepend>
              <v-avatar size="38" class="tipo-avatar">
                <v-icon color="white">{{ tipo.icono || obtenerIconoTipo(tipo.nombre) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="text-subtitle-2 tipo-title">
              {{ tipo.nombre }}
            </v-list-item-title>
            <template v-slot:append>
              <div class="d-flex align-center flex-wrap justify-end ga-2">
                <v-chip
                  color="grey"
                  outlined
                  size="small"
                  :class="{ 'grey--text': tipo.incidenciasActivas === 0 }"
                >
                  <v-icon start size="x-small">mdi-file-document-multiple</v-icon>
                  {{ tipo.incidenciasActivas }}
                </v-chip>
                <v-chip
                  :color="tipo.incidenciasSolucionadas > 0 ? 'success' : 'grey'"
                  outlined
                  size="small"
                  :class="{ 'grey--text': tipo.incidenciasSolucionadas === 0 }"
                >
                  <v-icon start size="x-small">mdi-check-circle</v-icon>
                  {{ tipo.incidenciasSolucionadas }}
                </v-chip>
                <v-icon size="small" color="grey-darken-1">mdi-chevron-right</v-icon>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <div class="text-caption text-center mt-3 text-grey">
          <v-icon>mdi-file-document-multiple</v-icon>
          Activas
          <v-icon class="ml-4">mdi-check-circle</v-icon>
          {{ textoEstadoSolucionado }}s
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { obtenerResumenTiposIncidencias } from '@/utils/api'
import { buildTipoRoute, sortTiposByConfiguredOrder } from '@/utils/tipoRoutes'

const TIPOS_INCIDENCIAS_INICIALES = JSON.parse(import.meta.env.VITE_TIPOS_INCIDENCIAS_INICIALES || '[]')

export default {
  name: 'TiposIncidencias',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const dialogVisible = ref(false)
    const tipos = ref([])
    const tiposUnicos = ref(0)
    const incidenciasActivas = ref(0)
    const incidenciasSolucionadas = ref(0)

    const textoEstadoSolucionado = computed(() =>
      import.meta.env.VITE_TEXTO_ESTADO_SOLUCIONADO || 'Solucionada'
    )

    const obtenerResumen = async () => {
      try {
        const response = await obtenerResumenTiposIncidencias()
        tipos.value = sortTiposByConfiguredOrder(
          response.data.tipos,
          TIPOS_INCIDENCIAS_INICIALES
        )
        tiposUnicos.value = response.data.tiposUnicos
        incidenciasActivas.value = response.data.incidenciasActivas
        incidenciasSolucionadas.value = response.data.incidenciasSolucionadas
      } catch (error) {
        console.error('Error al obtener el resumen de tipos:', error)
      }
    }

    const obtenerIconoTipo = (tipo) => {
      const tipoActual = tipos.value.find(item => item.nombre === tipo)
      if (tipoActual?.icono) {
        return tipoActual.icono
      }
      const tipoInicial = TIPOS_INCIDENCIAS_INICIALES.find(item => item.tipo === tipo)
      return tipoInicial?.icono || 'mdi-tag-outline'
    }

    const cerrar = () => {
      if (route.name === 'TiposIncidencias') {
        router.push({ name: 'Home' })
      } else {
        dialogVisible.value = false
      }
    }

    const irATipo = (tipo) => {
      router.push(buildTipoRoute(tipo.id, tipo.nombre))
    }

    onMounted(() => {
      obtenerResumen()
      if (route.name === 'TiposIncidencias') {
        dialogVisible.value = true
      }
    })

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'TiposIncidencias'
    })

    watch(dialogVisible, (newValue) => {
      if (!newValue && route.name === 'TiposIncidencias') {
        router.push('/')
      }
    })

    return {
      cerrar,
      dialogVisible,
      incidenciasActivas,
      incidenciasSolucionadas,
      irATipo,
      obtenerIconoTipo,
      textoEstadoSolucionado,
      tipos,
      tiposUnicos
    }
  }
}
</script>

<style scoped>
.tipos-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tipos-list {
  margin: 0 auto;
  max-width: 720px;
}

.tipos-resumen {
  line-height: 1.6;
}

.tipo-list-item {
  min-height: 64px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.tipo-list-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.tipo-avatar {
  background: linear-gradient(180deg, rgba(103, 83, 164, 0.92), rgba(103, 83, 164, 0.72));
}

.tipo-title {
  line-height: 1.45;
}

.text-grey {
  color: rgba(0, 0, 0, 0.6);
}

.v-chip {
  font-weight: 700;
}

.grey--text {
  color: rgba(0, 0, 0, 0.38) !important;
}

@media (max-width: 600px) {
  .tipos-list :deep(.v-list-item__append) {
    margin-left: 12px;
  }

  .tipo-list-item {
    padding-bottom: 10px;
    padding-top: 10px;
  }
}
</style>
