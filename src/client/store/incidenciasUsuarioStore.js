import { ref } from 'vue'

const incidenciasUsuario = ref({})
const incidenciasLoaded = ref(false)

export const useIncidenciasUsuarioStore = () => {
  const loadIncidenciasUsuario = () => {
    return new Promise((resolve) => {
      if (incidenciasLoaded.value) {
        resolve()
      } else {
        const incidenciasIds = Object.keys(localStorage)
          .filter(key => key.startsWith('incidencia_'))
          .map(key => parseInt(key.split('_')[1], 10))
        
        incidenciasUsuario.value = incidenciasIds
        incidenciasLoaded.value = true
        resolve()
      }
    })
  }

  const añadirIncidenciaUsuario = (id, codigoUnico) => {
    if (!incidenciasUsuario.value[id]) {
      incidenciasUsuario.value[id] = codigoUnico
      localStorage.setItem(`incidencia_${id}`, codigoUnico)
    }
  }

  const quitarIncidenciaUsuario = (id) => {
    const index = incidenciasUsuario.value.indexOf(id)
    if (index > -1) {
      incidenciasUsuario.value.splice(index, 1)
      localStorage.removeItem(`incidencia_${id}`)
    }
  }

  const esIncidenciaUsuario = (id) => incidenciasUsuario.value.includes(id)

  return {
    incidenciasUsuario,
    loadIncidenciasUsuario,
    añadirIncidenciaUsuario,
    quitarIncidenciaUsuario,
    esIncidenciaUsuario
  }
}