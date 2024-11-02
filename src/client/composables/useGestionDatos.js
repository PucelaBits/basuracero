import { ref } from 'vue';
import { useFavoritosStore } from '../store/favoritosStore';
import { useIncidenciasUsuarioStore } from '../store/incidenciasUsuarioStore';

export function useGestionDatos() {
  const { favoritos, añadirFavorito, quitarFavorito } = useFavoritosStore();
  const { incidenciasUsuario, añadirIncidenciaUsuario, quitarIncidenciaUsuario } = useIncidenciasUsuarioStore();

  const exportarDatos = () => {
    const datos = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      datos[key] = localStorage.getItem(key);
    }

    const jsonString = JSON.stringify(datos);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const nombreApp = import.meta.env.VITE_APP_NAME || 'basura_cero';
    const nombreArchivo = `${nombreApp.toLowerCase().replace(/\s+/g, '_')}_datos.json`;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importarDatos = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const datos = JSON.parse(e.target.result);
            
            // Limpiar localStorage actual
            localStorage.clear();

            // Importar todos los datos
            for (const [key, value] of Object.entries(datos)) {
              localStorage.setItem(key, value);
            }

            // Actualizar favoritos
            try {
              const favoritosData = JSON.parse(datos.favoriteIncidencias || '[]');
              // Limpiar favoritos actuales
              favoritos.value.forEach(id => quitarFavorito(id));
              // Añadir nuevos favoritos
              favoritosData.forEach(id => añadirFavorito(id));
            } catch (error) {
              console.error('Error al procesar favoritos:', error);
            }

            // Actualizar incidencias del usuario
            const incidenciasUsuarioData = Object.keys(datos)
              .filter(key => key.startsWith('incidencia_'))
              .map(key => parseInt(key.split('_')[1], 10))
              .filter(id => !isNaN(id));
            
            // Limpiar incidencias actuales
            incidenciasUsuario.value.forEach(id => quitarIncidenciaUsuario(id));
            // Añadir nuevas incidencias
            incidenciasUsuarioData.forEach(id => añadirIncidenciaUsuario(id));

            alert('Datos importados con éxito. La página se recargará para aplicar los cambios.');
            
            // Recargar la página después de un breve retraso
            setTimeout(() => {
              window.location.reload();
            }, 1000); // Espera 1 segundo antes de recargar

          } catch (error) {
            console.error('Error al importar datos:', error);
            alert('Error al importar datos. Por favor, asegúrate de que el archivo es válido.');
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  };

  return {
    exportarDatos,
    importarDatos
  };
}