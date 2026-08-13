<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { guardarSesion } from '@/lib/sesion'
import { mensajeDeError } from '@/lib/errores'
import AvisoMensaje from '@/components/AvisoMensaje.vue'

const router = useRouter()
const route = useRoute()

const usuario = ref('')
const password = ref('')
const error = ref('')

const { mutate: iniciarSesion, isPending } = useConvexMutation(api.auth.iniciarSesion)

async function entrar() {
  error.value = ''

  if (!usuario.value.trim() || !password.value) {
    error.value = 'Escribe tu usuario y tu contraseña.'
    return
  }

  try {
    const datos = await iniciarSesion({
      username: usuario.value,
      password: password.value,
    })
    guardarSesion({
      token: datos.token,
      username: datos.username,
      displayName: datos.displayName,
      role: datos.role,
      storeName: datos.storeName,
    })
    password.value = ''

    const destino = typeof route.query.redirigir === 'string' ? route.query.redirigir : '/'
    await router.replace(destino)
  } catch (e) {
    error.value = mensajeDeError(e)
    password.value = ''
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-kraft-50 px-5 py-12">
    <div class="w-full max-w-[380px]">
      <div class="overflow-hidden rounded-[10px] border border-kraft-200 bg-nuez-50">
        <div class="flex items-center gap-3 bg-tostado-900 px-6 py-5 text-kraft-50">
          <img src="/alita.png" alt="" class="h-12 w-auto" />
          <span class="leading-tight">
            <span class="block font-display text-[21px] font-bold tracking-[-0.02em]">
              Alita Secos
            </span>
            <span class="rotulo block text-cascara-400">Frutos secos</span>
          </span>
        </div>

        <form class="space-y-5 px-6 py-6" @submit.prevent="entrar">
          <div>
            <label class="etiqueta" for="usuario">Usuario</label>
            <input
              id="usuario"
              v-model="usuario"
              class="campo"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              autofocus
            />
          </div>

          <div>
            <label class="etiqueta" for="password">Contraseña</label>
            <input
              id="password"
              v-model="password"
              class="campo"
              type="password"
              autocomplete="current-password"
            />
          </div>

          <AvisoMensaje v-if="error" tipo="error" :texto="error" />

          <button class="btn-venta w-full" type="submit" :disabled="isPending">
            {{ isPending ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-[13px] text-cascara-600">
        Inventario y ventas. Uso interno del local.
      </p>
    </div>
  </div>
</template>
