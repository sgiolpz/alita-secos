<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { menuPara } from '@/lib/navegacion'
import { borrarSesion, esAdmin, sesion, token } from '@/lib/sesion'

/**
 * El contenido del menú: marca, secciones y quién está adentro.
 *
 * Es el mismo bloque en la barra lateral y en el cajón de móvil, así que las
 * dos navegaciones no pueden quedar diciendo cosas distintas.
 */
defineProps<{
  /** En el cajón aparece el botón de cerrar; en la barra fija no hace falta. */
  enCajon?: boolean
}>()

const emit = defineEmits<{ navegar: []; cerrar: [] }>()

const route = useRoute()
const router = useRouter()

const grupos = computed(() => menuPara(esAdmin.value))

const { mutate: cerrarSesionEnServidor } = useConvexMutation(api.auth.cerrarSesion)

async function salir() {
  const tokenActual = token.value
  borrarSesion()
  emit('navegar')
  await router.replace({ name: 'login' })
  try {
    await cerrarSesionEnServidor({ token: tokenActual })
  } catch {
    // La sesión local ya se cerró; si el servidor no responde no hay nada que hacer.
  }
}
</script>

<template>
  <div class="superficie-tostada flex h-full flex-col bg-tostado-900 text-kraft-50">
    <div class="flex items-start justify-between gap-2 px-5 py-4">
      <RouterLink to="/" class="flex items-center gap-3" @click="emit('navegar')">
        <img src="/alita.png" alt="" class="h-10 w-auto" />
        <span class="leading-tight">
          <span class="block font-display text-[19px] font-bold tracking-[-0.02em]">
            Alita Secos
          </span>
          <span class="rotulo block text-cascara-400">Frutos secos</span>
        </span>
      </RouterLink>

      <button
        v-if="enCajon"
        type="button"
        class="-mr-1.5 rounded-[4px] p-1.5 text-cascara-400 transition-colors hover:bg-tostado-800 hover:text-kraft-100"
        @click="emit('cerrar')"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="m5 5 10 10M15 5 5 15"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        </svg>
        <span class="sr-only">Cerrar menú</span>
      </button>
    </div>

    <!-- Si algún día las secciones no caben, esta columna se desplaza sola y
         la identidad y la sesión se quedan quietas arriba y abajo. -->
    <nav class="flex-1 space-y-5 overflow-y-auto py-3" aria-label="Secciones">
      <div v-for="grupo in grupos" :key="grupo.titulo">
        <p class="rotulo px-5 text-cascara-500">{{ grupo.titulo }}</p>

        <ul class="mt-1">
          <li v-for="enlace in grupo.enlaces" :key="enlace.nombre">
            <RouterLink
              :to="enlace.ruta"
              class="block border-l-2 px-5 py-2.5 font-sans text-[15px] font-semibold tracking-[-0.005em] transition-colors"
              :class="
                route.name === enlace.nombre
                  ? 'border-piel-500 bg-tostado-800 text-kraft-50'
                  : 'border-transparent text-cascara-400 hover:bg-tostado-800/60 hover:text-kraft-100'
              "
              :aria-current="route.name === enlace.nombre ? 'page' : undefined"
              @click="emit('navegar')"
            >
              {{ enlace.texto }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <div class="border-t border-tostado-700 px-5 py-4">
      <p class="text-[14px] font-semibold leading-tight text-kraft-100">
        {{ sesion?.displayName }}
      </p>
      <p class="rotulo mt-0.5 text-cascara-400">{{ sesion?.storeName }}</p>

      <button class="btn-ticket-suave mt-3 w-full" type="button" @click="salir">Salir</button>
    </div>
  </div>
</template>
