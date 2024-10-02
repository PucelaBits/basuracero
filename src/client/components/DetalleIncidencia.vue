<template>
  <v-dialog v-model="dialog" fullscreen hide-overlay transition="dialog-bottom-transition">
    <v-card class="detalle-incidencia">
      <div class="imagen-container">
        <v-carousel
          v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
          :show-arrows="incidencia.imagenes.length > 1"
          hide-delimiter-background
          height="270"
          class="imagen-detalle"
          :hide-delimiters="incidencia.imagenes.length <= 1"
        >
          <v-carousel-item
            v-for="(imagen, index) in incidencia.imagenes"
            :key="index"
            :src="imagen.ruta_imagen"
            :alt="incidencia.tipo"
            cover
            @click="abrirImagenCompleta(index)"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
              </v-row>
            </template>
          </v-carousel-item>
        </v-carousel>
        <div v-else class="spam-placeholder" height="270">
          <v-icon x-large color="grey">mdi-image-off</v-icon>
        </div>
        
        <!-- Pastillas de tipo y estado -->
        <div class="pastillas-container">
          <!-- Nuevo botón de favoritos -->
          <v-btn
            icon
            x-small
            class="favorite-btn"
            @click="toggleFavorite"
          >
            <v-icon small :color="isFavorite ? 'yellow darken-2' : 'grey lighten-1'">
              {{ isFavorite ? 'mdi-star' : 'mdi-star-outline' }}
            </v-icon>
          </v-btn>
          <span class="popup-chip" :title="incidencia.tipo">{{ truncateText(incidencia.tipo, 16) }}</span>
          <span :class="['estado-pastilla', incidencia.estado]">
            {{ incidencia.estado === 'activa' ? 'Activa' : 'Solucionada' }}
          </span>
        </div>
        
        <v-btn icon dark class="close-btn" @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text class="flex-grow-1 overflow-y-auto pa-0">
        <v-container class="px-4 py-6">
          <v-card flat class="mb-6" v-if="incidencia.estado !== 'spam'">
            <v-card-text class="text-body-3">
              {{ incidencia.descripcion }}
            </v-card-text>
          </v-card>

          <v-card flat class="mb-6" v-else>
            <v-card-text class="text-body-1 text-center">
              <v-icon large color="warning" class="mb-2">mdi-alert</v-icon>
              <p>Nuestra comunidad ha marcado esta incidencia como inadecuada o spam. Si cree que es un error, por favor <a href="https://t.me/basuracero" target="_blank">contacte con nosotros</a>.</p>
            </v-card-text>
          </v-card>

          <v-divider class="mb-3"></v-divider>

          <v-row align="center" class="text-caption text--secondary">
            <v-col cols="auto">
              <v-icon small class="mr-2">mdi-account</v-icon>
              {{ incidencia.nombre }}
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="auto">
              <v-icon small class="mr-2">mdi-calendar</v-icon>
              {{ formatDate(incidencia.fecha) }}
            </v-col>
          </v-row>

          <!-- Dirección -->
          <v-row v-if="incidencia.direccion" align="center" class="mt-2">
            <v-col cols="12">
              <a :href="geoLink" target="_blank" rel="noopener noreferrer" @click="clickGeoLink" class="text-decoration-none">
                <div class="d-flex align-center text-caption">
                  <v-icon small class="mr-2">mdi-map-marker</v-icon>
                  <span>{{ incidencia.direccion }}</span>
                  <v-icon class="ml-1" style="font-size: 25px;">mdi-directions</v-icon>
                </div>
              </a>
            </v-col>
          </v-row>

          <!-- Estado -->
          <v-row align="center" class="mt-2" v-if="incidencia.estado === 'solucionada' && incidencia.estado !== 'spam'">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon color="success" small class="mr-2">
                  mdi-check-circle
                </v-icon>
                <span class="success--text">
                  Solucionada
                </span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.estado === 'solucionada'" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon color="success" small class="mr-1">mdi-check-circle</v-icon>
                <v-icon small class="mr-2">mdi-calendar</v-icon>
                <span>{{ formatDate(incidencia.fecha_solucion) }}</span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.reportes_solucion > 0 && incidencia.estado !== 'spam'" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon small class="mr-2">mdi-account-group</v-icon>
                <span>{{ incidencia.reportes_solucion === 1 ? '1 persona ha indicado que está solucionada' : `${incidencia.reportes_solucion} personas han indicado que está solucionada` }}</span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.estado !== 'spam'" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption cursor-pointer" @click="mostrarDialogoReporteInadecuado = true">
                <v-icon small class="mr-2">mdi-alert-circle</v-icon>
                <span>Avisar de contenido inadecuado o spam</span>
              </div>
            </v-col>
          </v-row>
          <v-row v-if="incidencia.reportes_inadecuado > 0" align="center" class="mt-1">
            <v-col cols="auto">
              <div class="d-flex align-center text-caption">
                <v-icon small class="mr-2">mdi-alert</v-icon>
                <span>{{ incidencia.reportes_inadecuado === 1 ? '1 persona ha marcado este contenido como inadecuado' : `${incidencia.reportes_inadecuado} personas han marcado este contenido como inadecuado` }}</span>
              </div>
            </v-col>
          </v-row>

          <!-- Mapa -->
          <div class="mapa-container mt-4">
            <div id="mapa-detalle" class="mapa-detalle"></div>
          </div>

          <v-row class="mt-4">
            <v-col cols="12" class="text-center">
              <p class="text-caption">Todo el contenido está bajo licencia <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">CC BY-SA 4.0</a></p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions class="flex-column" id="botones-detalle" v-if="incidencia.estado !== 'spam'">
        <v-row class="mb-0">
          <v-col cols="auto" class="pt-2 pb-1">
            <v-btn
              v-if="incidencia.estado === 'activa'"
              @click="mostrarDialogoConfirmacion = true"
              :loading="reportando"
              :disabled="reportando"
              color="success"
            >
              <v-icon left>mdi-check-circle</v-icon>
              <span>{{ reportando ? 'Resolviendo...' : 'Resolver' }}</span>
            </v-btn>
          </v-col>
          <v-col cols="auto" class="pt-2 pb-1" v-if="canShare">
            <v-btn
              @click="compartir"
              color="info"
            >
              <v-icon left>mdi-share</v-icon>
              <span>Compartir</span>
            </v-btn>
          </v-col>
        </v-row>
        <v-btn
          @click="mostrarDialogoWhatsApp = true"
          v-if="incidencia.estado == 'activa'"
          color="primary"
          class="w-100"
        >
          <v-icon left>mdi-whatsapp</v-icon>
          <span style="margin-left: 5px;">Informar al ayuntamiento</span>
        </v-btn>
      </v-card-actions>

      <v-dialog v-model="mostrarDialogoExito" max-width="400">
        <v-card>
          <v-card-text class="text-center pa-4">
            <v-icon color="success" size="64" class="mb-4">mdi-check-circle</v-icon>
            <h2 class="text-h5 mb-4">Incidencia creada</h2>
            <p class="mb-4"><v-icon left>mdi-share</v-icon><strong>Compartela</strong> con tus vecinos en redes sociales o grupos de chat</p>
            <p>No olvides <v-icon left>mdi-whatsapp</v-icon> <strong>informar al ayuntamiento</strong> para que se registre oficialmente, anima a tus vecinos a que lo hagan también</p>
            <p class="mt-4">Cuando se haya solucionado vuelve y márcala como <v-icon left>mdi-check-circle</v-icon> <strong>resuelta</strong></p>
            <p class="mt-4">Fácil y rápido, usa los botones de parte inferior</p>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="cerrarDialogoExito">Entendido</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>

    <v-dialog v-model="mostrarDialogoConfirmacion" max-width="500px">
      <v-card>
        <v-card-title class="headline">Confirmar resolución</v-card-title>
        <v-card-text>
          ¿Has verificado presencialmente que la incidencia ha sido solucionada?
          <div ref="captchaContainer" class="frc-captcha" :data-sitekey="friendlyCaptchaSiteKey" data-lang="es"></div>
          <div class="subtitle-text">Se guardará una versión anonimizada de tu IP para evitar abusos</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="confirmarSolucion">Sí</v-btn>
          <v-btn color="red darken-1" text @click="cancelarConfirmacion">No</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mostrarDialogoAdvertencia" max-width="400px">
      <v-card>
        <v-card-title class="headline">Advertencia</v-card-title>
        <v-card-text>
          Sólo puedes marcarla como solucionada si lo has comprobado presencialmente.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mostrarDialogoAdvertencia = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo flotante para la imagen a pantalla completa -->
    <v-dialog v-model="dialogImagen" fullscreen>
      <v-card flat class="transparent">
        <v-carousel
          v-if="incidencia.imagenes && incidencia.imagenes.length > 0"
          :value="imagenSeleccionadaIndex"
          height="100vh"
          hide-delimiter-background
          :show-arrows="incidencia.imagenes.length > 1"
        >
          <v-carousel-item
            v-for="(imagen, i) in incidencia.imagenes"
            :key="i"
            :src="imagen.ruta_imagen"
            contain
            @click="dialogImagen = false"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
              </v-row>
            </template>
          </v-carousel-item>
        </v-carousel>
        <v-btn
          icon
          dark
          class="close-fullscreen-btn"
          @click="dialogImagen = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mostrarDialogoWhatsApp" max-width="500px">
      <v-card>
        <v-card-title class="headline">
          <v-icon left>mdi-whatsapp</v-icon>
          Informar por WhatsApp
        </v-card-title>
        <v-card-text>
          Cuando pulses aceptar se te redirigirá al bot de WhatsApp del ayuntamiento adjuntando la descripción y la dirección
          <br>
          <br><span class="subtitle-text"><strong>Nota:</strong> Si es la primera vez que hablas con el bot necesitarás mandarle primero "Hola" para activarle</span>
          <v-checkbox
            v-model="añadirAFavoritas"
            label="Añadir a mis favoritas"
            class="mt-2 mb-4"
            :value="true"
          ></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="enviarWhatsAppYFavoritos">Aceptar</v-btn>
          <v-btn color="error" text @click="mostrarDialogoWhatsApp = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Nuevo diálogo para mostrar errores -->
    <v-dialog v-model="mostrarDialogoError" max-width="400px">
      <v-card>
        <v-card-title class="headline">Error</v-card-title>
        <v-card-text>
          {{ mensajeError }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mostrarDialogoError = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mostrarDialogoReporteInadecuado" max-width="500px">
      <v-card>
        <v-card-title class="headline">Marcar como contenido inadecuado</v-card-title>
        <v-card-text>
          ¿Estás seguro de que quieres marcar este contenido como inadecuado o spam?
          <div ref="captchaContainerInadecuado" class="frc-captcha" :data-sitekey="friendlyCaptchaSiteKey" data-lang="es"></div>
          <div class="subtitle-text">Se guardará una versión anonimizada de tu IP para evitar abusos</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red darken-1" text @click="reportarContenidoInadecuado">Sí, informar</v-btn>
          <v-btn color="green darken-1" text @click="mostrarDialogoReporteInadecuado = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Añadir esto al final del template -->
    <v-snackbar
      v-model="snackbar"
      :timeout="2000"
      color="success"
      bottom
    >
      {{ snackbarText }}
    </v-snackbar>
  </v-dialog>
</template>

<script>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useResolverIncidencia } from '@/composables/useResolverIncidencia';
import { useInformarAyuntamiento } from '@/composables/useInformarAyuntamiento';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WidgetInstance } from 'friendly-challenge';
import { enviarEventoMatomo } from '../utils/analytics';
import { useFavoritosStore } from '../store/favoritosStore'; // Añade esta línea
import { useHead } from '@unhead/vue';

export default {
  name: 'DetalleIncidencia',
  props: {
    incidencia: {
      type: Object,
      required: true
    },
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'cerrar'],
  setup(props, { emit }) {
    const router = useRouter();
    const route = useRoute();
    const dialog = ref(props.modelValue);
    const mostrarDialogoConfirmacion = ref(false);
    const mostrarDialogoAdvertencia = ref(false);
    const dialogImagen = ref(false);
    const captchaSolution = ref(null);
    const captchaContainer = ref(null);
    const captchaWidget = ref(null);
    const canShare = ref(false);
    const mostrarDialogoWhatsApp = ref(false);
    const mostrarDialogoError = ref(false);
    const isComponentMounted = ref(true);
    const mostrarDialogoReporteInadecuado = ref(false);
    const captchaContainerInadecuado = ref(null);
    const captchaSolutionInadecuado = ref(null);
    const captchaWidgetInadecuado = ref(null);
    const mostrarDialogoExito = ref(false);
    const imagenSeleccionadaIndex = ref(0);
    const snackbar = ref(false);
    const snackbarText = ref('');
    const añadirAFavoritas = ref(true);

    const friendlyCaptchaSiteKey = import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY;

    const isIOS = computed(() => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    });

    const geoLink = computed(() => {
      if (props.incidencia.latitud && props.incidencia.longitud) {
        if (isIOS.value) {
          return `https://maps.apple.com/?q=${props.incidencia.latitud},${props.incidencia.longitud}`;
        } else {
          return `geo:${props.incidencia.latitud},${props.incidencia.longitud}?q=${props.incidencia.latitud},${props.incidencia.longitud}`;
        }
      }
      return '#';
    });

    const clickGeoLink = () => {
      enviarEventoMatomo('Incidencia', 'Clic en ruta', `ID: ${props.incidencia.id}`);
    };

    watch(() => props.modelValue, (newValue) => {
      dialog.value = newValue;
    });

    watch(dialog, (newValue) => {
      emit('update:modelValue', newValue);
      if (!newValue) {
        emit('cerrar');
      }
    });

    watch(mostrarDialogoConfirmacion, async (newValue) => {
      if (newValue) {
        await nextTick(); // Esperar a que el DOM se actualice
        if (import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED === 'true' && captchaContainer.value) {
          console.log('Inicializando captcha...');
          captchaWidget.value = new WidgetInstance(captchaContainer.value, {
            sitekey: import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY,
            doneCallback: (solution) => {
              captchaSolution.value = solution;
            },
            errorCallback: (err) => {
              console.error("Error al resolver el Captcha:", err);
            }
          });
        } else {
          console.error('Contenedor del captcha no encontrado');
        }
      }
    });

    const cerrar = () => {
      dialog.value = false;
      if (route.query.mostrarDialogoExito === 'true') {
        router.replace({ 
          name: 'DetalleIncidencia',
          params: { id: props.incidencia.id },
          query: {} 
        });
      } else {
        router.push({ name: 'Home' });
      }
    };

    const abrirImagenCompleta = (index) => {
      imagenSeleccionadaIndex.value = index;
      dialogImagen.value = true;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleDateString('es-ES', options).replace(',', '');
    };

    const { reportando, mensajeError, resolverIncidencia } = useResolverIncidencia();
    const { enviarWhatsApp } = useInformarAyuntamiento();

    const confirmarSolucion = async () => {
      if (!captchaSolution.value) {
        mostrarError('Por favor, completa el captcha.');
        return;
      }

      mostrarDialogoConfirmacion.value = false;
      try {
        const codigoUnico = localStorage.getItem(`incidencia_${props.incidencia.id}`);
        const resultado = await resolverIncidencia(props.incidencia.id, captchaSolution.value, codigoUnico);
        if (isComponentMounted.value) {
          if (resultado.solucionada) {
            props.incidencia.estado = 'solucionada';
            props.incidencia.fecha_solucion = new Date().toISOString();
          } else {
            props.incidencia.reportes_solucion = resultado.reportes_solucion;
          }
        }
      } catch (error) {
        if (isComponentMounted.value) {
          mostrarError(mensajeError.value);
        }
      } finally {
        if (captchaWidget.value) {
          captchaWidget.value.reset();
        }
      }
    };

    const cancelarConfirmacion = () => {
      mostrarDialogoConfirmacion.value = false;
      mostrarDialogoAdvertencia.value = true;
    };

    const truncateText = (text, maxLength) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    };

    const map = ref(null);

    const originalMetaTags = ref({
      title: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      twitterTitle: '',
      twitterDescription: '',
      twitterImage: ''
    });

    const actualizarMetadatos = () => {
      // Guardar metaetiquetas originales
      originalMetaTags.value.title = document.title;
      originalMetaTags.value.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      originalMetaTags.value.ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      originalMetaTags.value.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      originalMetaTags.value.twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
      originalMetaTags.value.twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
      originalMetaTags.value.twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '';

      // Actualizar título
      document.title = `Basura Cero - Incidencia ${props.incidencia.id}`;
      
      // Construir la URL completa de la imagen
      const fullImageUrl = new URL(props.incidencia.imagen, window.location.origin).href;

      // Actualizar metaetiquetas para la vista previa de redes sociales
      const updateMetaTag = (selector, attribute, content) => {
        let metaTag = document.querySelector(selector);
        if (metaTag) {
          metaTag.setAttribute(attribute, content);
        } else {
          metaTag = document.createElement('meta');
          metaTag.setAttribute(attribute, content);
          document.head.appendChild(metaTag);
        }
      };

      updateMetaTag('meta[property="og:title"]', 'content', `Basura Cero - Incidencia ${props.incidencia.id}`);
      updateMetaTag('meta[property="og:description"]', 'content', props.incidencia.descripcion);
      updateMetaTag('meta[property="og:image"]', 'content', fullImageUrl);
      updateMetaTag('meta[name="twitter:title"]', 'content', `Basura Cero - Incidencia ${props.incidencia.id}`);
      updateMetaTag('meta[name="twitter:description"]', 'content', props.incidencia.descripcion);
      updateMetaTag('meta[name="twitter:image"]', 'content', fullImageUrl);
    };

    const restaurarMetadatos = () => {
      document.title = originalMetaTags.value.title;

      const restoreMetaTag = (selector, attribute, content) => {
        const metaTag = document.querySelector(selector);
        if (metaTag) {
          metaTag.setAttribute(attribute, content);
        }
      };

      restoreMetaTag('meta[property="og:title"]', 'content', originalMetaTags.value.ogTitle);
      restoreMetaTag('meta[property="og:description"]', 'content', originalMetaTags.value.ogDescription);
      restoreMetaTag('meta[property="og:image"]', 'content', originalMetaTags.value.ogImage);
      restoreMetaTag('meta[name="twitter:title"]', 'content', originalMetaTags.value.twitterTitle);
      restoreMetaTag('meta[name="twitter:description"]', 'content', originalMetaTags.value.twitterDescription);
      restoreMetaTag('meta[name="twitter:image"]', 'content', originalMetaTags.value.twitterImage);
    };

    const cerrarDialogoExito = () => {
      mostrarDialogoExito.value = false;
      router.replace({ 
        name: route.name, 
        params: route.params,
        query: {} 
      });
    };

    const { favoritos, añadirFavorito, quitarFavorito, esFavorito } = useFavoritosStore();

    const isFavorite = computed(() => esFavorito(props.incidencia.id));

    const toggleFavorite = () => {
      if (isFavorite.value) {
        quitarFavorito(props.incidencia.id);
        snackbarText.value = 'Eliminada de favoritos';
      } else {
        añadirFavorito(props.incidencia.id);
        snackbarText.value = 'Añadida a favoritos';
      }

      // Mostrar el snackbar
      snackbar.value = true;

      // Enviar evento de Matomo
      enviarEventoMatomo('Incidencia', isFavorite.value ? 'Añadir a favoritos' : 'Quitar de favoritos', `ID: ${props.incidencia.id}`);
    };

    const updateMetaTags = () => {
      const title = `Basura Cero - Incidencia ${props.incidencia.id}`;
      const description = `${props.incidencia.tipo} en ${props.incidencia.direccion.split(',')[0]}, ${props.incidencia.direccion.split(',')[1]}` || 'Detalles de la incidencia en Basura Cero';
      const imageUrl = props.incidencia.imagenes && props.incidencia.imagenes.length > 0
        ? new URL(props.incidencia.imagenes[0].ruta_imagen, window.location.origin).href
        : '';
      const url = window.location.href;

      useHead({
        title,
        meta: [
          { name: 'description', content: description },
          // Open Graph / Facebook
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: url },
          { property: 'og:title', content: title },
          { property: 'og:description', content: description },
          { property: 'og:image', content: imageUrl },
          { property: 'og:image:alt', content: `Imagen de la incidencia ${props.incidencia.id}` },
          { property: 'og:site_name', content: 'Basura Cero' },
          // Twitter
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:url', content: url },
          { name: 'twitter:title', content: title },
          { name: 'twitter:description', content: description },
          { name: 'twitter:image', content: imageUrl },
          { name: 'twitter:image:alt', content: `Imagen de la incidencia ${props.incidencia.id}` },
          // Para iOS
          { name: 'apple-mobile-web-app-title', content: title },
          // Para Android
          { name: 'application-name', content: title },
          // Para WhatsApp
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          // Para LinkedIn
          { property: 'og:image:secure_url', content: imageUrl },
          // Para Pinterest
          { name: 'pinterest:media', content: imageUrl },
          { name: 'pinterest:description', content: description },
        ],
        link: [
          { rel: 'canonical', href: url }
        ]
      });
    };

    watch(() => props.incidencia, updateMetaTags, { immediate: true, deep: true });

    onMounted(() => {
      updateMetaTags();
      if (props.incidencia.latitud && props.incidencia.longitud) {
        map.value = L.map('mapa-detalle', {
          dragging: false,
          touchZoom: true,
          scrollWheelZoom: false,
          doubleClickZoom: true,
          boxZoom: false,
          tap: false
        }).setView([props.incidencia.latitud, props.incidencia.longitud], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          maxZoom: 19
        }).addTo(map.value);
        
        L.marker([props.incidencia.latitud, props.incidencia.longitud], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#c30b82;' class='marker-pin'></div>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          })
        }).addTo(map.value);
      }

      if (navigator.share) {
        canShare.value = true;
      }

      actualizarMetadatos();

      if (route.query.mostrarDialogoExito === 'true') {
        mostrarDialogoExito.value = true;
      }

      // Comprobar si la incidencia está en favoritos
      const favorites = JSON.parse(localStorage.getItem('favoriteIncidencias') || '[]');
      isFavorite.value = favorites.includes(props.incidencia.id);
    });

    onUnmounted(() => {
      isComponentMounted.value = false;
      if (captchaWidget.value) {
        captchaWidget.value.reset();
        captchaWidget.value = null;
      }
      restaurarMetadatos();
    });

    const compartir = () => {
      // Asumiendo que tienes acceso a estas propiedades
      const tipoIncidencia = props.incidencia.tipo;
      const direccionCompleta = props.incidencia.direccion;

      // Extraer los dos primeros elementos de la dirección
      const direccionCorta = direccionCompleta.split(',').slice(0, 2).join(',');

      const textoCompartir = `
        ${tipoIncidencia} en ${direccionCorta}
      `.trim();

      if (navigator.share) {
        enviarEventoMatomo('Incidencia', 'Compartir', `ID: ${props.incidencia.id}`);
        navigator.share({
          title: 'Basura Cero',
          text: textoCompartir,
          url: window.location.href
        }).catch((error) => {
          console.error('Error al compartir:', error);
        });
      } else {
        alert('La funcionalidad de compartir no está soportada en este navegador.');
      }
    };

    const handleEnviarWhatsApp = () => {
      enviarWhatsApp(props.incidencia);
      mostrarDialogoWhatsApp.value = false;
    };

    const mostrarError = (mensaje) => {
      mensajeError.value = mensaje;
      mostrarDialogoError.value = true;
    };

    const reportarContenidoInadecuado = async () => {
      if (!captchaSolutionInadecuado.value) {
        mostrarError('Por favor, completa el captcha.');
        return;
      }

      mostrarDialogoReporteInadecuado.value = false;
      try {
        const response = await axios.post(`/api/incidencias/${props.incidencia.id}/inadecuado`, {
          'frc-captcha-solution': captchaSolutionInadecuado.value
        });
        if (isComponentMounted.value) {
          props.incidencia.reportes_inadecuado = response.data.reportes;
          if (response.data.reportes >= 3) {
            props.incidencia.estado = 'spam';
          }
          enviarEventoMatomo('Incidencia', 'Marcar como spam', `ID: ${props.incidencia.id}`);
        }
      } catch (error) {
        console.error('Error al marcar contenido inadecuado:', error);
        if (isComponentMounted.value) {
          mostrarError(error.response?.data?.error || 'Error al marcar contenido inadecuado');
        }
      }
    };

    watch(mostrarDialogoReporteInadecuado, async (newValue) => {
      if (newValue) {
        await nextTick();
        if (import.meta.env.VITE_FRIENDLYCAPTCHA_ENABLED === 'true' && captchaContainerInadecuado.value) {
          console.log('Inicializando captcha para reporte inadecuado...');
          captchaWidgetInadecuado.value = new WidgetInstance(captchaContainerInadecuado.value, {
            sitekey: import.meta.env.VITE_FRIENDLYCAPTCHA_SITEKEY,
            doneCallback: (solution) => {
              captchaSolutionInadecuado.value = solution;
            },
            errorCallback: (err) => {
              console.error("Error al resolver el Captcha para reporte inadecuado:", err);
            }
          });
        } else {
          console.error('Contenedor del captcha para reporte inadecuado no encontrado');
        }
      }
    });

    const enviarWhatsAppYFavoritos = () => {
      handleEnviarWhatsApp();
      if (añadirAFavoritas.value && !isFavorite.value) {
        toggleFavorite();
      }
    };

    return {
      dialog,
      cerrar,
      abrirImagenCompleta,
      formatDate,
      confirmarSolucion,
      cancelarConfirmacion,
      reportando,
      mostrarDialogoConfirmacion,
      mostrarDialogoAdvertencia,
      dialogImagen,
      truncateText,
      captchaContainer,
      canShare,
      compartir,
      mostrarDialogoWhatsApp,
      enviarWhatsApp: handleEnviarWhatsApp,
      mostrarDialogoError,
      mensajeError,
      mostrarDialogoReporteInadecuado,
      reportarContenidoInadecuado,
      captchaContainerInadecuado,
      friendlyCaptchaSiteKey,
      geoLink,
      mostrarDialogoExito,
      cerrarDialogoExito,
      clickGeoLink,
      imagenSeleccionadaIndex,
      isFavorite,
      toggleFavorite,
      snackbar,
      snackbarText,
      añadirAFavoritas,
      enviarWhatsAppYFavoritos,
    };
  }
};
</script>

<style scoped>

a {
  color: #000;
}

.detalle-incidencia {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.imagen-container {
  position: relative;
}

.imagen-detalle {
  width: 100%;
  height: 300px;
  object-fit: cover;
  cursor: pointer;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background-color: rgba(255, 255, 255, 0.5) !important;
}

.pastillas-container {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 5px;
  align-items: center;
  z-index: 1;
}

.popup-chip, .estado-pastilla {
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.estado-pastilla {
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  color: white;
}

.mapa-detalle {
  height: 300px;
  width: 100%;
  margin-top: 20px;
}

/* Estilos para el marcador personalizado */
.custom-div-icon {
  background: none;
  border: none;
}

.marker-pin {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  background: #c30b82;
  position: absolute;
  transform: rotate(-45deg);
  left: 50%;
  top: 50%;
  margin: -15px 0 0 -15px;
}

.marker-pin::after {
  content: '';
  width: 24px;
  height: 24px;
  margin: 3px 0 0 3px;
  background: #fff;
  position: absolute;
  border-radius: 50%;
}

.v-card__text {
  flex-grow: 1;
  overflow-y: auto;
}

.v-card__actions {
  padding: 16px;
}

.w-100 {
  width: 100%;
}

.mapa-container {
  position: relative;
  height: 40vh;
}

.frc-captcha {
  margin: 0.5em auto;
}

.spam-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  height: 270px;
}

.subtitle-text {
  color: grey;
  font-size: smaller;
}

#botones-detalle {
  gap: 0px !important;
}

.imagen-container {
  position: relative;
}

.pastillas-container {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
}

.popup-chip {
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  margin-right: 8px;
}

.estado-pastilla {
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  color: white;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.close-fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

.favorite-btn {
  width: 24px !important;
  height: 24px !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

.favorite-btn .v-icon {
  font-size: 16px;
}
</style>