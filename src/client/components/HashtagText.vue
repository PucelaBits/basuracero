<template>
  <span class="hashtag-text">
    <template v-for="(part, index) in parts" :key="`${part.type}-${index}-${part.value}`">
      <RouterLink
        v-if="part.type === 'hashtag'"
        :to="{ name: 'Etiqueta', params: { etiqueta: part.tag } }"
        class="hashtag-link"
        :aria-label="`Ver incidencias con la etiqueta ${part.value}`"
        @click.stop="emit('navigate')"
      >{{ part.value }}</RouterLink>
      <template v-else>{{ part.value }}</template>
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { splitHashtags } from '@/utils/hashtags'

const props = defineProps({ text: { type: String, default: '' } })
const emit = defineEmits(['navigate'])
const parts = computed(() => splitHashtags(props.text))
</script>

<style scoped>
.hashtag-link { color: rgb(var(--v-theme-primary)); font-weight: 600; text-decoration: none; border-radius: 4px; }
.hashtag-link:hover, .hashtag-link:focus-visible { text-decoration: underline; }
.hashtag-link:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
</style>
