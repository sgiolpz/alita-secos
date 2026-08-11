<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useConvexMutation, useConvexQuery } from 'convex-vue'

import { api } from '../convex/_generated/api'
import { borrarSesion, haySesion, sesion, token } from '@/lib/sesion'

const route = useRoute()
const router = useRouter()

const enlaces = [
  { nombre: 'ventas', ruta: '/', texto: 'Ventas' },
  { nombre: 'inventario', ruta: '/inventario', texto: 'Inventario' },
]

const enLogin = computed(() => route.name === 'login')

const { mutate: cerrarSesionEnServidor } = useConvexMutation(api.auth.cerrarSesion)

// Si el token deja de ser válido (expiró o se cambió la contraseña), se cierra
// la sesión en el navegador y se vuelve a la pantalla de acceso.
const { data: sesionEnServidor } = useConvexQuery(api.auth.sesionActual, () => ({
  token: token.value,
}))

watch(sesionEnServidor, async (valor) => {
  if (haySesion.value && valor === null) {
    borrarSesion()
    await router.replace({ name: 'login' })
  }
})

async function salir() {
  const tokenActual = token.value
  borrarSesion()
  await router.replace({ name: 'login' })
  try {
    await cerrarSesionEnServidor({ token: tokenActual })
  } catch {
    // La sesión local ya se cerró; si el servidor no responde no hay nada que hacer.
  }
}
</script>

<template>
  <RouterView v-if="enLogin" />

  <div v-else class="min-h-screen bg-cascara-50">
    <header class="bg-gradient-to-r from-cascara-800 via-cascara-700 to-cascara-600 shadow-md">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <img src="/favicon.svg" alt="" class="h-10 w-10 drop-shadow" />
          <div>
            <h1 class="text-xl font-bold tracking-tight text-nuez-100">Alita Secos</h1>
            <p class="text-sm text-cascara-200">Control de inventario y ventas</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <nav class="flex gap-1 rounded-xl bg-cascara-900/25 p-1">
            <RouterLink
              v-for="enlace in enlaces"
              :key="enlace.nombre"
              :to="enlace.ruta"
              class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              :class="
                route.name === enlace.nombre
                  ? 'bg-nuez-100 text-cascara-800 shadow'
                  : 'text-cascara-100 hover:bg-cascara-600/60 hover:text-white'
              "
            >
              {{ enlace.texto }}
            </RouterLink>
          </nav>

          <div class="flex items-center gap-2 border-l border-cascara-500/50 pl-3">
            <span class="text-sm font-medium text-cascara-100">{{ sesion?.displayName }}</span>
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-semibold text-cascara-200 transition-colors hover:bg-cascara-900/30 hover:text-white"
              type="button"
              @click="salir"
            >
              Salir
            </button>
          </div>
        </div>
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
