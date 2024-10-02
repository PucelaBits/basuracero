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
          <v-window-item v-for="periodo in ['semana', 'mes', 'total']" :key="periodo" :value="periodo">
            <p class="text-center mt-4 mb-2 text-grey">
              <v-icon color="grey">{{ iconosPeriodo[periodo] }}</v-icon>
              <span class="ml-2">{{ rangoFechas[periodo] }}</span>
            </p>
            <p class="text-center mt-2 mb-2 text-grey">
              <v-icon color="grey">mdi-account</v-icon>
              <span class="ml-2">{{ usuariosUnicos[periodo] }}</span>
              <v-icon color="grey" class="ml-4">mdi-file-document-multiple</v-icon>
              <span class="ml-2">{{ totalIncidencias[periodo] }}</span>
              <v-icon color="grey" class="ml-4">mdi-check-circle</v-icon>
              <span class="ml-2">{{ incidenciasSolucionadas[periodo] }}</span>
            </p>
            <v-list class="ranking-list">
              <v-list-item v-for="usuario in rankings[periodo]" :key="usuario.posicion" class="mb-2 rounded-lg elevation-1">
                <template v-slot:prepend>
                  <v-avatar size="32">
                    <v-img :src="getAvatarUrl(usuario.nombre)"></v-img>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-subtitle-2">{{ usuario.nombre }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    color="grey"
                    outlined
                    x-small
                    class="mr-2"
                    :class="{ 'grey--text': usuario.incidencias === 0 }"
                  >
                    <v-icon start size="x-small">mdi-file-document-multiple</v-icon>
                    {{ usuario.incidencias }}
                  </v-chip>
                  <v-chip
                    :color="usuario.incidenciasSolucionadas > 0 ? 'success' : 'grey'"
                    outlined
                    x-small
                    :class="{ 'grey--text': usuario.incidenciasSolucionadas === 0 }"
                  >
                    <v-icon start size="x-small">mdi-check-circle</v-icon>
                    {{ usuario.incidenciasSolucionadas }}
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
    const rankings = ref({
      semana: [],
      mes: [],
      total: []
    });
    const usuariosUnicos = ref({
      semana: 0,
      mes: 0,
      total: 0
    });
    const totalIncidencias = ref({
      semana: 0,
      mes: 0,
      total: 0
    });
    const incidenciasSolucionadas = ref({
      semana: 0,
      mes: 0,
      total: 0
    });
    const iconosPeriodo = {
      semana: 'mdi-calendar-range',
      mes: 'mdi-calendar-month',
      total: 'mdi-calendar-clock'
    };

    const cerrar = () => {
      if (route.name === 'RankingUsuarios') {
        router.push({ name: 'Home' });
      } else {
        dialogVisible.value = false;
      }
    }

    const obtenerRanking = async () => {
      try {
        const periodos = ['semana', 'mes', 'total'];
        const responses = await Promise.all(
          periodos.map(periodo => 
            axios.get(`/api/incidencias/usuarios/ranking?periodo=${periodo}&minIncidencias=${periodo === 'total' ? 2 : 1}`)
          )
        );

        responses.forEach((response, index) => {
          const periodo = periodos[index];
          rankings.value[periodo] = response.data.ranking;
          usuariosUnicos.value[periodo] = response.data.usuariosUnicos;
          totalIncidencias.value[periodo] = response.data.totalIncidencias;
          incidenciasSolucionadas.value[periodo] = response.data.incidenciasSolucionadas;
        });
      } catch (error) {
        console.error('Error al obtener el ranking de usuarios:', error);
      }
    };

    const getAvatarUrl = (nombre) => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff`;
    };

    const rangoFechas = computed(() => {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      
      return {
        semana: `${formatearFecha(inicioSemana)} - ${formatearFecha(finSemana)}`,
        mes: formatearMesAnio(hoy),
        total: `${hoy.getFullYear()}`
      };
    });

    const formatearFecha = (fecha) => {
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    const formatearMesAnio = (fecha) => {
      return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
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
      rankings,
      usuariosUnicos,
      totalIncidencias,
      incidenciasSolucionadas,
      iconosPeriodo,
      cerrar,
      getAvatarUrl,
      rangoFechas,
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

.v-chip {
  font-weight: bold;
}

.grey--text {
  color: rgba(0, 0, 0, 0.38) !important;
}
</style>