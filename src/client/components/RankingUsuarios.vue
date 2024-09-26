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

        <v-list class="ranking-list">
          <v-list-item v-for="usuario in ranking" :key="usuario.posicion" class="mb-2 rounded-lg elevation-1">
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
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';

export default {
  name: 'RankingUsuarios',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const dialogVisible = ref(false);
    const ranking = ref([]);

    const cerrar = () => {
      dialogVisible.value = false;
      router.push('/');
    };

    const obtenerRanking = async () => {
      try {
        const response = await axios.get('/api/incidencias/usuarios/ranking?minIncidencias=2');
        ranking.value = response.data.ranking;
      } catch (error) {
        console.error('Error al obtener el ranking de usuarios:', error);
      }
    };

    const getAvatarUrl = (nombre) => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff`;
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
      ranking,
      cerrar,
      getAvatarUrl,
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
</style>