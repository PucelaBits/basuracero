import { ref, watch } from 'vue'

const favoritos = ref(JSON.parse(localStorage.getItem('favoriteIncidencias') || '[]'))

watch(favoritos, (newFavoritos) => {
  localStorage.setItem('favoriteIncidencias', JSON.stringify(newFavoritos))
}, { deep: true })

export const useFavoritosStore = () => {
  const favoritosLoaded = ref(false)

  const loadFavoritos = () => {
    return new Promise((resolve) => {
      if (favoritosLoaded.value) {
        resolve()
      } else {
        watch(favoritos, () => {
          favoritosLoaded.value = true
          resolve()
        }, { immediate: true })
      }
    })
  }

  const añadirFavorito = (id) => {
    if (!favoritos.value.includes(id)) {
      favoritos.value.push(id)
    }
  }

  const quitarFavorito = (id) => {
    const index = favoritos.value.indexOf(id)
    if (index > -1) {
      favoritos.value.splice(index, 1)
    }
  }

  const esFavorito = (id) => favoritos.value.includes(id)

  return {
    favoritos,
    añadirFavorito,
    quitarFavorito,
    esFavorito,
    loadFavoritos
  }
}