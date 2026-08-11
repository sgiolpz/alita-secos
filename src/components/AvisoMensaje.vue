<script setup lang="ts">
defineProps<{
  tipo: 'error' | 'exito'
  texto: string
}>()
</script>

<template>
  <p
    class="border-l-[3px] py-2 pl-3 text-[14px] leading-snug"
    :class="
      tipo === 'error'
        ? 'border-piel-600 bg-piel-600/6 text-piel-700'
        : 'border-cascara-400 bg-cascara-400/12 text-tostado-800'
    "
    role="status"
  >
    {{ texto }}
  </p>
</template>
