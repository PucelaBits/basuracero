<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <main class="avisos-ranking">
      <v-toolbar color="primary" class="elevation-2" dark>
        <v-btn icon aria-label="Cerrar ranking" @click="cerrar"><v-icon>mdi-close</v-icon></v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-group-outline</v-icon>
          Avisos al ayuntamiento
        </v-toolbar-title>
      </v-toolbar>

      <section class="avisos-ranking__content">
        <header class="avisos-ranking__intro">
          <div>
            <p class="avisos-ranking__eyebrow">PARTICIPACIÓN CIUDADANA</p>
            <h1>Incidencias más avisadas</h1>
            <p>Incidencias que se han informado al Ayuntamiento.</p>
          </div>
          <v-switch
            v-model="incluirSolucionadas"
            color="primary"
            hide-details
            inset
            label="Mostrar solucionadas"
            class="avisos-ranking__toggle"
          />
        </header>

        <div v-if="cargando" class="avisos-ranking__empty"><v-progress-circular indeterminate color="primary" size="28" /> Cargando avisos…</div>
        <div v-else-if="error" class="avisos-ranking__empty"><v-icon color="error">mdi-alert-circle-outline</v-icon> {{ error }}</div>
        <div v-else-if="!filasOrdenadas.length" class="avisos-ranking__empty"><v-icon>mdi-information-outline</v-icon> No hay avisos para este filtro.</div>

        <div v-else class="avisos-ranking__table-wrap">
          <table class="avisos-ranking__table">
            <thead>
              <tr>
                <th class="avisos-ranking__rank">#</th>
                <th class="avisos-ranking__image">Imagen</th>
                <th><button type="button" @click="ordenarPor('descripcion')">Incidencia <SortIcon campo="descripcion" :actual="ordenacion" /></button></th>
                <th class="avisos-ranking__desktop-only"><button type="button" @click="ordenarPor('tipo')">Categoría <SortIcon campo="tipo" :actual="ordenacion" /></button></th>
                <th class="avisos-ranking__desktop-only"><button type="button" @click="ordenarPor('barrio')">Zona <SortIcon campo="barrio" :actual="ordenacion" /></button></th>
                <th class="avisos-ranking__date"><button type="button" @click="ordenarPor('primerAvisoAt')">Fecha <SortIcon campo="primerAvisoAt" :actual="ordenacion" /></button></th>
                <th class="avisos-ranking__total"><button type="button" @click="ordenarPor('total')">Avisos <SortIcon campo="total" :actual="ordenacion" /></button></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(incidencia, index) in filasOrdenadas" :key="incidencia.incidenciaId" tabindex="0" @click="abrirIncidencia(incidencia)" @keydown.enter="abrirIncidencia(incidencia)">
                <td class="avisos-ranking__rank">{{ index + 1 }}</td>
                <td class="avisos-ranking__image">
                  <img v-if="incidencia.rutaImagen" :src="incidencia.rutaImagen" alt="" loading="lazy">
                  <span v-else><v-icon>mdi-image-outline</v-icon></span>
                </td>
                <td class="avisos-ranking__description"><strong>{{ incidencia.descripcion }} <span v-if="incidencia.estado === 'solucionada'" class="avisos-ranking__status">Solucionada</span></strong><small>{{ incidencia.direccion || 'Sin dirección' }}</small></td>
                <td class="avisos-ranking__desktop-only"><span class="avisos-ranking__category"><v-icon size="16">{{ incidencia.icono || 'mdi-tag-outline' }}</v-icon>{{ incidencia.tipo || 'Sin categoría' }}</span></td>
                <td class="avisos-ranking__desktop-only">{{ incidencia.barrio || 'Sin zona' }}</td>
                <td class="avisos-ranking__date" :title="incidencia.primerAvisoAt ? 'Fecha del primer aviso al Ayuntamiento' : 'Fecha de publicación de la incidencia'">{{ formatearFecha(incidencia.primerAvisoAt || incidencia.fecha) }}</td>
                <td class="avisos-ranking__total"><span><v-icon size="19">mdi-account-group-outline</v-icon>{{ incidencia.total }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </v-dialog>
</template>

<script>
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const SortIcon = defineComponent({
  props: { campo: String, actual: Object },
  setup(props) {
    return () => h('span', { class: 'avisos-ranking__sort-icon', 'aria-hidden': 'true' }, props.actual.campo === props.campo ? (props.actual.direccion === 'asc' ? '↑' : '↓') : '↕')
  }
})

export default {
  name: 'RankingAvisos',
  components: { SortIcon },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const dialogVisible = ref(false)
    const incluirSolucionadas = ref(false)
    const cargando = ref(false)
    const error = ref('')
    const incidencias = ref([])
    const ordenacion = ref({ campo: 'total', direccion: 'desc' })

    const obtenerRanking = async () => {
      cargando.value = true
      error.value = ''
      try {
        const { data } = await axios.get('/api/incidencias/reportes-externos/ranking', {
          params: { channel: 'whatsapp', limit: 500, incluirSolucionadas: incluirSolucionadas.value, incluirDetalles: true }
        })
        incidencias.value = data.ranking || []
      } catch (err) {
        console.error('Error al obtener el ranking de avisos:', err)
        error.value = 'No se ha podido cargar el ranking. Inténtalo de nuevo.'
      } finally {
        cargando.value = false
      }
    }

    const filasOrdenadas = computed(() => incidencias.value.filter((incidencia) => Number(incidencia.total) > 1).sort((a, b) => {
      const { campo, direccion } = ordenacion.value
      const izquierda = campo === 'primerAvisoAt' ? (a.primerAvisoAt || a.fecha || '') : (a[campo] ?? '')
      const derecha = campo === 'primerAvisoAt' ? (b.primerAvisoAt || b.fecha || '') : (b[campo] ?? '')
      const comparacion = campo === 'total'
        ? Number(izquierda) - Number(derecha)
        : campo === 'primerAvisoAt'
          ? new Date(String(izquierda).replace(' ', 'T')).getTime() - new Date(String(derecha).replace(' ', 'T')).getTime()
        : String(izquierda).localeCompare(String(derecha), 'es', { sensitivity: 'base' })
      return direccion === 'asc' ? comparacion : -comparacion
    }))

    const ordenarPor = (campo) => {
      ordenacion.value = { campo, direccion: ordenacion.value.campo === campo && ordenacion.value.direccion === 'desc' ? 'asc' : 'desc' }
    }
    const formatearFecha = (fecha) => {
      if (!fecha) return '—'
      const date = new Date(String(fecha).replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return '—'
      return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
    }
    const abrirIncidencia = (incidencia) => router.push(incidencia.url)
    const cerrar = () => router.push({ name: 'Home' })

    onMounted(() => {
      dialogVisible.value = route.name === 'RankingAvisos'
      obtenerRanking()
    })
    watch(incluirSolucionadas, obtenerRanking)
    watch(() => route.name, (nombre) => { dialogVisible.value = nombre === 'RankingAvisos' })
    watch(dialogVisible, (visible) => { if (!visible && route.name === 'RankingAvisos') cerrar() })

    return { dialogVisible, incluirSolucionadas, cargando, error, ordenacion, filasOrdenadas, ordenarPor, formatearFecha, abrirIncidencia, cerrar }
  }
}
</script>

<style scoped>
.avisos-ranking { height: 100vh; height: 100dvh; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; background: #f8faf9; color: #1e2931; }
.avisos-ranking__content { max-width: 1180px; margin: 0 auto; padding: 40px 28px 64px; }
.avisos-ranking__intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; margin-bottom: 28px; }
.avisos-ranking__eyebrow { margin: 0 0 8px; color: #567367; font-size: .72rem; font-weight: 800; letter-spacing: .08em; }
.avisos-ranking h1 { margin: 0; font-size: clamp(1.75rem, 3vw, 2.45rem); line-height: 1.15; letter-spacing: -.03em; }
.avisos-ranking__intro > div > p:last-child { max-width: 670px; margin: 12px 0 0; color: #5e6a70; line-height: 1.55; }
.avisos-ranking__toggle { flex: 0 0 auto; min-width: 210px; font-size: .92rem; }
.avisos-ranking__table-wrap { overflow-x: auto; border-top: 1px solid #d7dfdb; border-bottom: 1px solid #d7dfdb; }
.avisos-ranking__table { width: 100%; min-width: 840px; border-collapse: collapse; }
.avisos-ranking__table th { padding: 13px 10px; color: #5a6b68; font-size: .72rem; letter-spacing: .04em; text-align: left; text-transform: uppercase; white-space: nowrap; }
.avisos-ranking__table th button { color: inherit; font: inherit; font-weight: 800; cursor: pointer; }
.avisos-ranking__sort-icon { margin-left: 4px; color: #758d82; }
.avisos-ranking__table td { padding: 12px 10px; border-top: 1px solid #e0e6e3; vertical-align: middle; }
.avisos-ranking__table tbody tr { cursor: pointer; transition: background-color .16s ease; }
.avisos-ranking__table tbody tr:hover, .avisos-ranking__table tbody tr:focus { background: #edf4f0; outline: none; }
.avisos-ranking__rank { width: 34px; color: #81918b; font-variant-numeric: tabular-nums; }
.avisos-ranking__image { width: 66px; }
.avisos-ranking__image img, .avisos-ranking__image span { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 8px; background: #e4ebe7; color: #84918b; object-fit: cover; }
.avisos-ranking__description { min-width: 220px; max-width: 330px; }
.avisos-ranking__description strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: .93rem; line-height: 1.35; }
.avisos-ranking__description small { display: block; overflow: hidden; margin-top: 4px; color: #6f7c7a; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.avisos-ranking__category { display: inline-flex; align-items: center; gap: 6px; color: #465854; font-size: .83rem; }
.avisos-ranking__status { display: inline-flex; margin-left: 6px; padding: 3px 7px; align-items: center; border-radius: 99px; background: #ecedef; color: #66716d; font-size: .72rem; font-weight: 700; line-height: 1.2; vertical-align: middle; }
.avisos-ranking__date { width: 108px; color: #52635e; font-size: .84rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.avisos-ranking__total { text-align: right !important; }
.avisos-ranking__total span { display: inline-flex; align-items: center; gap: 5px; color: #245d54; font-size: 1rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.avisos-ranking__empty { display: flex; min-height: 180px; align-items: center; justify-content: center; gap: 10px; color: #687571; }
@media (max-width: 700px) {
  .avisos-ranking__content { padding: 24px 16px 44px; }
  .avisos-ranking__intro { display: block; }
  .avisos-ranking__toggle { margin-top: 20px; }
  .avisos-ranking__table-wrap { overflow-x: hidden; }
  .avisos-ranking__table { min-width: 0; table-layout: fixed; }
  .avisos-ranking__desktop-only, .avisos-ranking__image, .avisos-ranking__rank { display: none; }
  .avisos-ranking__table th, .avisos-ranking__table td { padding: 13px 6px; }
  .avisos-ranking__description { min-width: 0; max-width: none; }
  .avisos-ranking__description strong { -webkit-line-clamp: 2; font-size: .9rem; }
  .avisos-ranking__description small { display: none; }
  .avisos-ranking__date { width: 84px; font-size: .78rem; }
  .avisos-ranking__total { width: 68px; }
  .avisos-ranking__total span { gap: 3px; font-size: .92rem; }
  .avisos-ranking__total .v-icon { font-size: 17px !important; }
}
</style>
