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
  { nombre: 'productos', ruta: '/productos', texto: 'Productos' },
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

  <div v-else class="flex min-h-screen flex-col bg-kraft-50">
    <header class="bg-tostado-900 text-kraft-50">
      <div class="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <RouterLink to="/" class="flex items-center gap-3">
          <img src="/favicon.svg" alt="" class="h-9 w-9" />
          <span class="leading-tight">
            <span class="block font-display text-[19px] font-bold tracking-[-0.02em]">
              Alita Secos
            </span>
            <span class="rotulo block text-cascara-400">Frutos secos</span>
          </span>
        </RouterLink>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <nav class="flex gap-6">
            <RouterLink
              v-for="enlace in enlaces"
              :key="enlace.nombre"
              :to="enlace.ruta"
              class="border-b-2 pb-1 font-sans text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors"
              :class="
                route.name === enlace.nombre
                  ? 'border-piel-500 text-kraft-50'
                  : 'border-transparent text-cascara-400 hover:text-kraft-100'
              "
            >
              {{ enlace.texto }}
            </RouterLink>
          </nav>

          <div class="flex items-center gap-3 sm:border-l sm:border-tostado-700 sm:pl-6">
            <span class="text-[13px] text-cascara-400">{{ sesion?.displayName }}</span>
            <button
              class="rounded-[4px] px-2 py-1 text-[13px] font-semibold text-kraft-100 transition-colors hover:bg-tostado-700"
              type="button"
              @click="salir"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <RouterView />
    </main>

    <footer class="mx-auto w-full max-w-6xl px-5 pb-8">
      <p class="rotulo border-t border-kraft-200 pt-4 text-cascara-500">
        Alita Secos
      </p>
    </footer>
  </div>
</template>
