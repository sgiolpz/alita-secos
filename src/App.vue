<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const enlaces = [
  { nombre: 'inventario', ruta: '/', texto: 'Inventario' },
  { nombre: 'ventas', ruta: '/ventas', texto: 'Ventas' },
]

const activo = computed(() => route.name)
</script>

<template>
  <div class="min-h-screen bg-cascara-50">
    <header class="bg-gradient-to-r from-cascara-800 via-cascara-700 to-cascara-600 shadow-md">
      <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <img src="/favicon.svg" alt="" class="h-10 w-10 drop-shadow" />
          <div>
            <h1 class="text-xl font-bold tracking-tight text-nuez-100">Alita Secos</h1>
            <p class="text-sm text-cascara-200">Control de inventario y ventas</p>
          </div>
        </div>

        <nav class="flex gap-1 rounded-xl bg-cascara-900/25 p-1">
          <RouterLink
            v-for="enlace in enlaces"
            :key="enlace.nombre"
            :to="enlace.ruta"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            :class="
              activo === enlace.nombre
                ? 'bg-nuez-100 text-cascara-800 shadow'
                : 'text-cascara-100 hover:bg-cascara-600/60 hover:text-white'
            "
          >
            {{ enlace.texto }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <RouterView />
    </main>

    <footer class="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-cascara-500">
      Alita Secos · datos en tiempo real con Convex
    </footer>
  </div>
</template>
