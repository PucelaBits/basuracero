<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card class="ranking-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <v-icon left class="mr-2">mdi-trophy</v-icon>
          Ranking de usuarios
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-4">
        <p class="text-body-1 text-center mb-6">
          Estos son los usuarios de nuestra comunidad que más incidencias han enviado
        </p>

        <v-tabs v-model="tab" centered>
          <v-tab value="semana">Semana</v-tab>
          <v-tab value="mes">Mes</v-tab>
          <v-tab value="total">Total</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <v-window-item value="semana">
            <p class="text-center mt-4 mb-2 text-grey">
              <v-icon color="grey">mdi-calendar-range</v-icon>
              <span class="ml-2">{{ rangoFechasSemana }}</span>
            </p>
            <p class="text-center mt-2 mb-2 text-grey">
              <v-icon color="grey">mdi-account</v-icon>
              <span class="ml-2">{{ usuariosUnicosSemana }}</span>
              <v-icon color="grey" class="ml-4">mdi-file-document-multiple</v-icon>
              <span class="ml-2">{{ totalIncidenciasSemana }}</span>
              <v-icon color="grey" class="ml-4">mdi-check-circle</v-icon>
              <span class="ml-2">{{ incidenciasSolucionadasSemana }}</span>
            </p>
            <v-list class="ranking-list">
              <v-list-item v-for="usuario in rankingSemana" :key="usuario.posicion" class="mb-2 rounded-lg elevation-1">
                <template v-slot:prepend>
                  <v-avatar size="32">
                    <v-img :src="getAvatarUrl(usuario.nombre)"></v-img>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-subtitle-2">{{ usuario.nombre }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="primary" outlined x-small>
                    {{ usuario.incidencias }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-window-item>

          <v-window-item value="mes">
            <p class="text-center mt-4 mb-2 text-grey">
              <v-icon color="grey">mdi-calendar-month</v-icon>
              <span class="ml-2">{{ rangoFechasMes }}</span>
            </p>
            <p class="text-center mt-2 mb-2 text-grey">
              <v-icon color="grey">mdi-account</v-icon>
              <span class="ml-2">{{ usuariosUnicosMes }}</span>
              <v-icon color="grey" class="ml-4">mdi-file-document-multiple</v-icon>
              <span class="ml-2">{{ totalIncidenciasMes }}</span>
              <v-icon color="grey" class="ml-4">mdi-check-circle</v-icon>
              <span class="ml-2">{{ incidenciasSolucionadasMes }}</span>
            </p>
            <v-list class="ranking-list">
              <v-list-item v-for="usuario in rankingMes" :key="usuario.posicion" class="mb-2 rounded-lg elevation-1">
                <template v-slot:prepend>
                  <v-avatar size="32">
                    <v-img :src="getAvatarUrl(usuario.nombre)"></v-img>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-subtitle-2">{{ usuario.nombre }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="primary" outlined x-small>
                    {{ usuario.incidencias }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-window-item>

          <v-window-item value="total">
            <p class="text-center mt-4 mb-2 text-grey">
              <v-icon color="grey">mdi-calendar-clock</v-icon>
              <span class="ml-2">{{ rangoFechasTotal }}</span>
            </p>
            <p class="text-center mt-2 mb-2 text-grey">
              <v-icon color="grey">mdi-account</v-icon>
              <span class="ml-2">{{ usuariosUnicosTotal }}</span>
              <v-icon color="grey" class="ml-4">mdi-file-document-multiple</v-icon>
              <span class="ml-2">{{ totalIncidenciasTotal }}</span>
              <v-icon color="grey" class="ml-4">mdi-check-circle</v-icon>
              <span class="ml-2">{{ incidenciasSolucionadasTotal }}</span>
            </p>
            <v-list class="ranking-list">
              <v-list-item v-for="usuario in rankingTotal" :key="usuario.posicion" class="mb-2 rounded-lg elevation-1">
                <template v-slot:prepend>
                  <v-avatar size="32">
                    <v-img :src="getAvatarUrl(usuario.nombre)"></v-img>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-subtitle-2">{{ usuario.nombre }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="primary" outlined x-small>
                    {{ usuario.incidencias }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';

export default {
  name: 'RankingUsuarios',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const dialogVisible = ref(false);
    const tab = ref('semana');
    const rankingSemana = ref([]);
    const rankingMes = ref([]);
    const rankingTotal = ref([]);
    const usuariosUnicosSemana = ref(0);
    const usuariosUnicosMes = ref(0);
    const usuariosUnicosTotal = ref(0);
    const totalIncidenciasSemana = ref(0);
    const totalIncidenciasMes = ref(0);
    const totalIncidenciasTotal = ref(0);
    const incidenciasSolucionadasSemana = ref(0);
    const incidenciasSolucionadasMes = ref(0);
    const incidenciasSolucionadasTotal = ref(0);

    const cerrar = () => {
      dialogVisible.value = false;
      router.push('/');
    };

    const obtenerRanking = async () => {
      try {
        const [responseSemana, responseMes, responseTotal] = await Promise.all([
          axios.get('/api/incidencias/usuarios/ranking?periodo=semana&minIncidencias=1'),
          axios.get('/api/incidencias/usuarios/ranking?periodo=mes&minIncidencias=1'),
          axios.get('/api/incidencias/usuarios/ranking?periodo=total&minIncidencias=2')
        ]);
        rankingSemana.value = responseSemana.data.ranking;
        rankingMes.value = responseMes.data.ranking;
        rankingTotal.value = responseTotal.data.ranking;
        usuariosUnicosSemana.value = responseSemana.data.usuariosUnicos;
        usuariosUnicosMes.value = responseMes.data.usuariosUnicos;
        usuariosUnicosTotal.value = responseTotal.data.usuariosUnicos;
        totalIncidenciasSemana.value = responseSemana.data.totalIncidencias;
        totalIncidenciasMes.value = responseMes.data.totalIncidencias;
        totalIncidenciasTotal.value = responseTotal.data.totalIncidencias;
        incidenciasSolucionadasSemana.value = responseSemana.data.incidenciasSolucionadas;
        incidenciasSolucionadasMes.value = responseMes.data.incidenciasSolucionadas;
        incidenciasSolucionadasTotal.value = responseTotal.data.incidenciasSolucionadas;
      } catch (error) {
        console.error('Error al obtener el ranking de usuarios:', error);
      }
    };

    const getAvatarUrl = (nombre) => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff`;
    };

    const rangoFechasSemana = computed(() => {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      return `${formatearFecha(inicioSemana)} - ${formatearFecha(finSemana)}`;
    });

    const rangoFechasMes = computed(() => {
      const hoy = new Date();
      return `${hoy.toLocaleString('es-ES', { month: 'long' })} ${hoy.getFullYear()}`;
    });

    const rangoFechasTotal = computed(() => {
      const hoy = new Date();
      return `${hoy.getFullYear()}`;
    });

    const formatearFecha = (fecha) => {
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    onMounted(() => {
      obtenerRanking();
      if (route.name === 'RankingUsuarios') {
        dialogVisible.value = true;
      }
    });

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'RankingUsuarios';
    });

    watch(dialogVisible, (newValue) => {
      if (!newValue && route.name === 'RankingUsuarios') {
        router.push('/');
      }
    });

    return {
      dialogVisible,
      tab,
      rankingSemana,
      rankingMes,
      rankingTotal,
      usuariosUnicosSemana,
      usuariosUnicosMes,
      usuariosUnicosTotal,
      totalIncidenciasSemana,
      totalIncidenciasMes,
      totalIncidenciasTotal,
      incidenciasSolucionadasSemana,
      incidenciasSolucionadasMes,
      incidenciasSolucionadasTotal,
      cerrar,
      getAvatarUrl,
      rangoFechasSemana,
      rangoFechasMes,
      rangoFechasTotal,
    };
  },
};
</script>

<style scoped>
.ranking-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ranking-list {
  max-width: 600px;
  margin: 0 auto;
}

.v-list-item {
  transition: all 0.3s ease;
  height: 48px;
}

.v-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.v-list-item-content {
  padding: 0 8px;
}

.text-grey {
  color: rgba(0, 0, 0, 0.6); /* Un gris medio, puedes ajustar la opacidad según prefieras */
}
</style>