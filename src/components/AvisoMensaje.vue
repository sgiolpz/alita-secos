<script setup lang="ts">
defineProps<{
  tipo: 'error' | 'exito'
  texto: string
}>()
</script>

<template>
  <p
    class="rounded-lg border px-3 py-2 text-sm"
    :class="
      tipo === 'error'
        ? 'border-piel-400/40 bg-piel-500/10 text-piel-700'
        : 'border-cascara-400/40 bg-cascara-400/15 text-cascara-800'
    "
    role="status"
  >
    {{ texto }}
  </p>
</template>
