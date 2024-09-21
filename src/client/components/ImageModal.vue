<template>
  <div v-if="isOpen" class="image-modal" @click="close">
    <img :src="imageUrl" alt="Imagen en grande" @click.stop>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ImageModal',
  setup() {
    const isOpen = ref(false)
    const imageUrl = ref('')

    const open = (url) => {
      imageUrl.value = url
      isOpen.value = true
    }

    const close = () => {
      isOpen.value = false
    }

    return { isOpen, imageUrl, open, close }
  }
}
</script>

<style scoped>
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.image-modal img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}
</style>