<template>
  <v-dialog v-model="dialogVisible" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card v-if="dialogVisible" class="maraton-guide-card">
      <v-toolbar color="primary" class="elevation-2">
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center text-truncate">
          <v-icon left size="small" class="mr-2 mb-1">mdi-calendar-star</v-icon>
          <span class="text-truncate">Organiza un evento</span>
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-0 overflow-y-auto">
        <v-container fluid>
          <v-row justify="center">
            <v-col cols="12" sm="11" md="10" lg="8">
              <v-img
                src="/img/evento.jpg"
                alt="Imagen de evento"
                width="100%"
                class="mb-4"
              ></v-img>

              <!-- Objetivo -->
              <v-card class="mb-6">
                <v-card-text>
                  <v-row align="center" class="mb-4">
                    <v-col cols="auto">
                      <v-icon size="large">mdi-target</v-icon>
                    </v-col>
                    <v-col>
                      <h3 class="text-h6 font-weight-bold mb-2">Objetivo</h3>
                      <p class="text-body-3">Facilitar la coordinación entre vecinos para reportar y validar incidencias en nuestros barrios</p>
                    </v-col>
                  </v-row>
                  <v-alert
                    type="info"
                    variant="tonal"
                    color="primary"
                    density="compact"
                    class="mb-0"
                  >
                    <strong>¡Tú eliges!</strong><br /> Puedes participar solo, con amigos y familiares o unirte a un grupo de vecinos<br /><br /> Únete a <u><a href="https://t.me/basuraceroapp" target="_blank">nuestro grupo de Telegram</a></u> para conocer a otros vecinos activos
                  </v-alert>
                </v-card-text>
              </v-card>

              <!-- Índice de navegación rápida -->
              <v-card class="mb-3 mt-2">
                <v-card-title class="text-subtitle-1 pb-0">Índice</v-card-title>
                <v-card-text>
                  <v-list density="compact">
                    <v-list-item v-for="(paso, index) in pasos" :key="index" @click="scrollToPaso(index + 1)" density="compact">
                      <v-list-item-title class="text-caption">{{ paso.titulo }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>

              <v-timeline align="start" density="compact" class="timeline-responsive">
                <!-- Paso 1 -->
                <v-timeline-item dot-color="primary" size="small">
                  <template v-slot:opposite>
                    <div class="text-subtitle-1">Paso 1</div>
                  </template>
                  <v-card :id="`paso-1`">
                    <v-card-title class="text-h6 pa-2">
                      <v-icon start>mdi-clipboard-check-outline</v-icon>
                      Preparación
                    </v-card-title>
                    <v-card-subtitle class="pa-2 pb-0">Paso 1</v-card-subtitle>
                    <v-card-text class="pa-2">
                      <v-list>
                        <v-list-item prepend-icon="mdi-calendar">Elige una fecha y hora para el evento</v-list-item>
                        <v-list-item prepend-icon="mdi-map-marker">Define un punto de encuentro en el barrio</v-list-item>
                        <v-list-item prepend-icon="mdi-account-group">Invita a tus vecinos por redes sociales, WhatsApp o carteles</v-list-item>
                        <v-list-item prepend-icon="mdi-chat">
                          Usa un grupo de chat existente para coordinar o usa 
                          <a href="https://t.me/basuraceroapp" target="_blank">el Telegram de Basura Cero</a> <br />
                          <small>Puedes solicitar crear un subgrupo para tu barrio</small>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>

                <!-- Paso 2 -->
                <v-timeline-item dot-color="primary" size="small">
                  <template v-slot:opposite>
                    <div class="text-subtitle-1">Paso 2</div>
                  </template>
                  <v-card :id="`paso-2`">
                    <v-card-title class="text-h6 pa-2">
                      <v-icon start>mdi-calendar-today</v-icon>
                      El día del evento
                    </v-card-title>
                    <v-card-subtitle class="pa-2 pb-0">Paso 2</v-card-subtitle>
                    <v-card-text class="pa-2">
                      <v-expansion-panels>
                        <v-expansion-panel>
                          <v-expansion-panel-title class="pb-0">
                            <v-icon start>mdi-information</v-icon>
                            Introducción
                          </v-expansion-panel-title>
                          <div class="text-caption text-grey ml-14 mb-2">5 min.</div>
                          <v-expansion-panel-text>
                            <ul>
                              <li>Da la bienvenida a los participantes y agradece su participación</li>
                              <li>Explica el objetivo del evento</li>
                            </ul>
                            <v-alert class="mt-3 text-body-2" density="compact" :icon="false">
                              <i class="text-grey-darken-1">"Con este evento queremos mejorar nuestro barrio documentando incidencias que lleven sin atender más de 24 horas, añadiéndolas a un mapa e informando al ayuntamiento para que quede constancia oficial.<br /><br /> También queremos validar si las ya reportadas han sido solucionadas y marcarlas como tales."</i>
                            </v-alert>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
        
                        <v-expansion-panel>
                          <v-expansion-panel-title class="pb-0">
                            <v-icon start>mdi-cellphone</v-icon>
                            Instalación de la App
                          </v-expansion-panel-title>
                          <div class="text-caption text-grey ml-14 mb-2">5 min.</div>
                          <v-expansion-panel-text>
                            <p>Muestra cómo instalar Basura Cero:</p>
                            <ol>
                              <li>Abre el navegador en el móvil (Chrome o Safari preferiblemente)</li>
                              <li>Ve a basuracero.pucelabits.org o busca Basura Cero Valladolid en tu buscador</li>
                              <li>Sigue las instrucciones para añadir a la pantalla de inicio</li>
                            </ol>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
        
                        <v-expansion-panel>
                          <v-expansion-panel-title class="pb-0">
                            <v-icon start>mdi-plus-circle</v-icon>
                            Cómo reportar incidencias
                          </v-expansion-panel-title>
                          <div class="text-caption text-grey ml-14 mb-2">5 min.</div>
                          <v-expansion-panel-text>
                            <p>Demuestra los pasos:</p>
                            <ol>
                              <li>Abre la app</li>
                              <li>Pulsa el icono "+"</li>
                              <li>Rellena el formulario</li>
                              <li>Elige el tipo de incidencia</li>
                              <li>Describe brevemente el problema (puedes dictarlo por voz usando el icono de micrófono)</li>
                              <li>Añade o toma una foto de la incidencia<br /><small>Evita sacar caras, matrículas o datos personales en las fotos</small></li>
                              <li>Envía el reporte</li>
                              <li>Usa el botón de informar al ayuntamiento</li>
                              <li>Comparte el enlace en redes y en el grupo de chat de vecinos</li>
                            </ol>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
        
                        <v-expansion-panel>
                          <v-expansion-panel-title class="pb-0">
                            <v-icon start>mdi-check-circle</v-icon>
                            Cómo validar incidencias solucionadas
                          </v-expansion-panel-title>
                          <div class="text-caption text-grey ml-14 mb-2">5 min.</div>
                          <v-expansion-panel-text>
                            <p>Explica el proceso:</p>
                            <ol>
                              <li>Abre el menú superior derecho y selecciona "Validar cercanas"</li>
                              <li>Busca incidencias cercanas en el mapa y desplázate hasta ellas</li>
                              <li>Verifica en persona si realmente está solucionada</li>
                              <li>Confirma en la app si está resuelta pulsando el botón de "Resolver"</li>
                              <li>Si no está resuelta, haz clic en "Informar al ayuntamiento" y comparte el enlace en el grupo de chat de vecinos</li>
                            </ol>
                            <v-alert class="mt-3 text-body-2" density="compact" :icon="false">
                              Nota: Se necesitan varios reportes de personas diferentes para dar por resuelta una incidencia
                            </v-alert>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
        
                        <v-expansion-panel>
                          <v-expansion-panel-title class="pb-0">
                            <v-icon start>mdi-map</v-icon>
                            Organización del recorrido
                          </v-expansion-panel-title>
                          <div class="text-caption text-grey ml-14 mb-2">5 min.</div>
                          <v-expansion-panel-text>
                            <ul>
                              <li>Divide a los participantes en grupos pequeños (idealmente 3-4 personas)</li>
                              <li>Asigna diferentes calles o zonas a cada grupo</li>
                              <li>Establece un tiempo de regreso al punto de encuentro (ej. 1 hora)</li>
                            </ul>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>

                <!-- Paso 3 -->
                <v-timeline-item dot-color="primary" size="small">
                  <template v-slot:opposite>
                    <div class="text-subtitle-1">Paso 3</div>
                  </template>
                  <v-card :id="`paso-3`">
                    <v-card-title class="text-h6 pa-2">
                      <v-icon start>mdi-map</v-icon>
                      Durante el recorrido
                    </v-card-title>
                    <v-card-subtitle class="pa-2 pb-0">Paso 3</v-card-subtitle>
                    <v-card-text class="pa-2">
                      <ul>
                        <li>Anima a los participantes a reportar todo lo que vean</li>
                        <li>Recuérdales validar las incidencias ya solucionadas</li>
                      </ul>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>

                <!-- Paso 4 -->
                <v-timeline-item dot-color="primary" size="small">
                  <template v-slot:opposite>
                    <div class="text-subtitle-1">Paso 4</div>
                  </template>
                  <v-card :id="`paso-4`">
                    <v-card-title class="text-h6 pa-2">
                      <v-icon start>mdi-check-circle</v-icon>
                      Cierre del evento
                    </v-card-title>
                    <v-card-subtitle class="pa-2 pb-0">Paso 4</v-card-subtitle>
                    <v-card-text class="pa-2">
                      <ul>
                        <li>Reúne a todos en el punto de encuentro</li>
                        <li>Comparte los resultados: número de incidencias reportadas y validadas<br /><small>Mándanos un pequeño resumen del evento <a href="https://t.me/basuraceroapp" target="_blank">al grupo de Telegram</a></small></li>
                        <li>Recuerda que pueden seguir usando la app a diario para reportar nuevas incidencias y validar si ven alguna ya solucionada</li>
                        <li>Agradece la participación y planea el próximo evento</li>
                      </ul>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>

              <v-card class="mt-6">
                <v-card-title>
                  <v-icon left>mdi-lightbulb</v-icon>
                  Consejos adicionales
                </v-card-title>
                <v-card-text>
                  <ul>
                    <li>Lleva baterías externas por si alguien necesita cargar su móvil</li>
                    <li>Sugiere que los participantes lleven agua y protección solar</li>
                    <li>Recuerda que la seguridad es lo primero: no tomar riesgos innecesarios al reportar</li>
                  </ul>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-btn
        @click="scrollToTop"
        icon="mdi-arrow-up"
        size="small"
        color="primary"
        class="scroll-to-top-btn"
      ></v-btn>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'MaratonGuide',
  setup() {
    const dialogVisible = ref(false)
    const router = useRouter()
    const route = useRoute()
    const showScrollToTop = ref(false)

    const cerrar = () => {
      dialogVisible.value = false
      router.push({ name: 'Home' })
    }

    watch(() => route.name, (newRouteName) => {
      dialogVisible.value = newRouteName === 'OrganizarEvento'
    }, { immediate: true })

    const pasos = [
      { titulo: 'Preparación' },
      { titulo: 'El día del evento' },
      { titulo: 'Durante el recorrido' },
      { titulo: 'Cierre del evento' }
    ]

    const scrollToTop = () => {
      const container = document.querySelector('.v-card-text.overflow-y-auto');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    const scrollToPaso = (pasoIndex) => {
      const elemento = document.getElementById(`paso-${pasoIndex}`)
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const handleScroll = () => {
      showScrollToTop.value = window.scrollY > 200
    }

    onMounted(() => {
      window.addEventListener('scroll', handleScroll)
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
    })

    return {
      dialogVisible,
      cerrar,
      pasos,
      scrollToTop,
      scrollToPaso,
      showScrollToTop
    }
  }
}
</script>

<style scoped>
.maraton-guide-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.v-card-text.overflow-y-auto {
  flex-grow: 1;
  overflow-y: auto;
}

/* Estilo para el botón "Volver arriba" */
.v-btn.v-btn--fixed {
  z-index: 100;
}

.timeline-responsive {
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 600px) {
  .timeline-responsive ::v-deep(.v-timeline-divider__dot) {
    margin-left: 0;
  }

  .timeline-responsive ::v-deep(.v-timeline-item__body) {
    padding-left: 8px;
    padding-right: 8px;
  }

  .timeline-responsive ::v-deep(.v-timeline-item__opposite) {
    display: none;
  }
}

/* Estilos adicionales para mejorar la responsividad */
.v-card-title {
  word-break: break-word;
  font-size: 1.1rem;
  padding: 12px 16px;
}

.v-card-text {
  padding: 12px 16px;
}

.v-list-item {
  padding: 0;
}

.v-expansion-panel-title {
  min-height: 48px;
}

/* Estilo para las listas no enumeradas */
ul, ol {
  padding-left: 20px;
  margin-bottom: 8px;
}

/* Añadir espaciado entre elementos li */
li {
  margin-bottom: 8px;
}

/* Nuevo estilo para los enlaces */
:deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

:deep(a:hover) {
  opacity: 0.8;
}

/* Ajuste para los v-alert */
:deep(.v-alert) {
  padding: 8px 12px;
}

:deep(.v-alert.text-body-2) {
  font-size: 0.875rem;
}

/* Nuevos estilos para el timeline */
.timeline-responsive ::v-deep(.v-timeline-item__body) {
  padding: 0 !important;
  margin: 0 !important;
}

.timeline-responsive ::v-deep(.v-card) {
  margin-bottom: 8px;
}

.timeline-responsive ::v-deep(.v-card-title) {
  font-size: 1rem;
  padding: 8px 12px;
}

.timeline-responsive ::v-deep(.v-card-subtitle) {
  font-size: 0.875rem;
  padding: 0 12px 4px;
}

.timeline-responsive ::v-deep(.v-card-text) {
  padding: 8px 12px;
}

/* Estilo actualizado para el botón "Volver arriba" */
.scroll-to-top-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 100;
}

/* Asegúrate de que el contenedor de desplazamiento tenga una altura máxima */
.v-card-text.overflow-y-auto {
  max-height: calc(100vh - 64px); /* Ajusta este valor según la altura de tu toolbar */
  overflow-y: auto;
}
</style>