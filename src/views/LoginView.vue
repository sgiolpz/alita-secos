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
    const sesion = await iniciarSesion({
      username: usuario.value,
      password: password.value,
    })
    guardarSesion(sesion)
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
  <div class="flex min-h-screen items-center justify-center bg-cascara-50 px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center text-center">
        <img src="/favicon.svg" alt="" class="h-16 w-16" />
        <h1 class="mt-3 text-2xl font-bold text-cascara-900">Alita Secos</h1>
        <p class="text-sm text-cascara-600">Control de inventario y ventas</p>
      </div>

      <form class="tarjeta space-y-4 p-6" @submit.prevent="entrar">
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

        <button class="btn-primario w-full" type="submit" :disabled="isPending">
          {{ isPending ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>
