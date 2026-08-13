<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useConvexQuery } from 'convex-vue'

import { api } from '../convex/_generated/api'
import { borrarSesion, haySesion, sincronizarSesion, token } from '@/lib/sesion'
import PanelNavegacion from '@/components/PanelNavegacion.vue'

const route = useRoute()
const router = useRouter()

const enLogin = computed(() => route.name === 'login')

/** El cajón de navegación de móvil. En pantallas grandes el menú está siempre a la vista. */
const menuAbierto = ref(false)

const anchoDeEscritorio = window.matchMedia('(min-width: 64rem)')

function cerrarMenu() {
  menuAbierto.value = false
}

// Con el cajón abierto, el fondo no debe desplazarse: lo que se toca es el menú.
watch(menuAbierto, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : ''
})

function alPresionarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') cerrarMenu()
}

// Al pasar a pantalla grande el cajón deja de tener sentido: se cierra para no
// dejar el fondo bloqueado.
function alCambiarElAncho(evento: MediaQueryListEvent) {
  if (evento.matches) cerrarMenu()
}

watch(menuAbierto, (abierto) => {
  if (abierto) {
    window.addEventListener('keydown', alPresionarTecla)
    anchoDeEscritorio.addEventListener('change', alCambiarElAncho)
  } else {
    window.removeEventListener('keydown', alPresionarTecla)
    anchoDeEscritorio.removeEventListener('change', alCambiarElAncho)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', alPresionarTecla)
  anchoDeEscritorio.removeEventListener('change', alCambiarElAncho)
})

// Si el token deja de ser válido (expiró o se cambió la contraseña), se cierra
// la sesión en el navegador y se vuelve a la pantalla de acceso.
const { data: sesionEnServidor } = useConvexQuery(api.auth.sesionActual, () => ({
  token: token.value,
}))

watch(sesionEnServidor, async (valor) => {
  if (!haySesion.value) return

  if (valor === null) {
    borrarSesion()
    await router.replace({ name: 'login' })
    return
  }

  if (!valor) return

  // Si el administrador cambió de tienda o de rol a alguien, el cambio se ve
  // sin tener que volver a entrar.
  sincronizarSesion({
    username: valor.username,
    displayName: valor.displayName,
    role: valor.role,
    storeName: valor.storeName,
  })

  if (route.meta.soloAdmin && valor.role !== 'admin') {
    await router.replace({ name: 'ventas' })
  }
})
</script>

<template>
  <RouterView v-if="enLogin" />

  <div v-else class="min-h-screen bg-kraft-50 lg:flex">
    <!-- Pantallas chicas: solo la marca y la llave del menú. El nombre de la
         sección ya lo dice el título de la página. -->
    <header
      class="superficie-tostada sticky top-0 z-30 flex items-center gap-3 bg-tostado-900 px-4 py-3 text-kraft-50 lg:hidden"
    >
      <button
        type="button"
        class="-ml-1.5 rounded-[4px] p-1.5 text-cascara-400 transition-colors hover:bg-tostado-800 hover:text-kraft-100"
        aria-controls="menu-principal"
        :aria-expanded="menuAbierto"
        @click="menuAbierto = true"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        </svg>
        <span class="sr-only">Abrir menú</span>
      </button>

      <RouterLink to="/" class="flex items-center gap-2.5">
        <img src="/alita.png" alt="" class="h-8 w-auto" />
        <span class="font-display text-[17px] font-bold tracking-[-0.02em]">Alita Secos</span>
      </RouterLink>
    </header>

    <!-- Pantallas grandes: el menú vive en la columna y no se va nunca. -->
    <aside class="hidden w-64 shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen">
      <PanelNavegacion />
    </aside>

    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuAbierto"
        class="fixed inset-0 z-40 bg-tostado-900/60 transition-opacity lg:hidden"
        @click="cerrarMenu"
      />
    </Transition>

    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-if="menuAbierto"
        id="menu-principal"
        class="fixed inset-y-0 left-0 z-50 w-[17rem] max-w-[85vw] transition-transform lg:hidden"
      >
        <PanelNavegacion en-cajon @navegar="cerrarMenu" @cerrar="cerrarMenu" />
      </div>
    </Transition>

    <main class="min-w-0 flex-1">
      <div class="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
        <RouterView />
      </div>
    </main>
  </div>
</template>
