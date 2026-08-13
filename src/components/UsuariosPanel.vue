<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { Tienda, UsuarioAdmin } from '@/lib/tipos'
import { mensajeDeError } from '@/lib/errores'
import { sesion, token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

const props = defineProps<{
  usuarios: UsuarioAdmin[]
  tiendas: Tienda[]
  cargando: boolean
}>()

type Rol = 'admin' | 'member'

const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: 'member', etiqueta: 'Vende en su tienda' },
  { valor: 'admin', etiqueta: 'Administrador global' },
]

const nuevoUsuario = ref('')
const nuevoNombre = ref('')
const nuevaPassword = ref('')
const nuevaTienda = ref<Id<'stores'> | ''>('')
const nuevoRol = ref<Rol>('member')

const error = ref('')
const exito = ref('')

const editandoId = ref<Id<'users'> | null>(null)
const editNombre = ref('')
const editTienda = ref<Id<'stores'> | ''>('')
const editRol = ref<Rol>('member')
const editPassword = ref('')

const { mutate: crear, isPending: creando } = useConvexMutation(api.admin.crearUsuario)
const { mutate: actualizar, isPending: guardando } = useConvexMutation(api.admin.actualizarUsuario)

const activas = computed(() => props.tiendas.filter((tienda) => tienda.active))

// La primera tienda queda elegida sola: casi siempre es la que se quiere.
watch(
  activas,
  (lista) => {
    if (!nuevaTienda.value && lista.length > 0) {
      nuevaTienda.value = lista[0]._id
    }
  },
  { immediate: true },
)

function cerrarEdicion() {
  editandoId.value = null
  editPassword.value = ''
  error.value = ''
}

function abrirEdicion(usuario: UsuarioAdmin) {
  error.value = ''
  exito.value = ''
  editandoId.value = usuario._id
  editNombre.value = usuario.displayName
  editTienda.value = usuario.storeId ?? (activas.value[0]?._id ?? '')
  editRol.value = usuario.role
  editPassword.value = ''
}

async function crearUsuario() {
  error.value = ''
  exito.value = ''

  if (!nuevoUsuario.value.trim()) {
    error.value = 'Escribe el usuario con el que va a entrar.'
    return
  }
  if (!nuevoNombre.value.trim()) {
    error.value = 'Escribe el nombre visible.'
    return
  }
  if (nuevaPassword.value.length < 4) {
    error.value = 'La contraseña debe tener al menos 4 caracteres.'
    return
  }
  if (!nuevaTienda.value) {
    error.value = 'Elige la tienda donde va a trabajar.'
    return
  }

  try {
    await crear({
      token: token.value,
      username: nuevoUsuario.value,
      displayName: nuevoNombre.value.trim(),
      password: nuevaPassword.value,
      storeId: nuevaTienda.value as Id<'stores'>,
      role: nuevoRol.value,
    })
    exito.value = `${nuevoNombre.value.trim()} ya puede entrar con el usuario "${nuevoUsuario.value.trim().toLowerCase()}".`
    nuevoUsuario.value = ''
    nuevoNombre.value = ''
    nuevaPassword.value = ''
    nuevoRol.value = 'member'
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function guardarEdicion(id: Id<'users'>) {
  error.value = ''
  exito.value = ''

  if (!editNombre.value.trim()) {
    error.value = 'El nombre visible no puede quedar vacío.'
    return
  }
  if (!editTienda.value) {
    error.value = 'Elige una tienda.'
    return
  }
  if (editPassword.value && editPassword.value.length < 4) {
    error.value = 'La contraseña debe tener al menos 4 caracteres.'
    return
  }

  try {
    await actualizar({
      token: token.value,
      id,
      displayName: editNombre.value.trim(),
      storeId: editTienda.value as Id<'stores'>,
      role: editRol.value,
      password: editPassword.value || undefined,
    })
    exito.value = editPassword.value
      ? `Datos guardados. ${editNombre.value.trim()} tendrá que entrar de nuevo con su contraseña nueva.`
      : 'Datos guardados.'
    cerrarEdicion()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

function etiquetaRol(rol: Rol): string {
  return ROLES.find((opcion) => opcion.valor === rol)?.etiqueta ?? rol
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Personas</h2>
      <span class="rotulo">
        {{ usuarios.length }} {{ usuarios.length === 1 ? 'cuenta' : 'cuentas' }}
      </span>
    </div>

    <form
      class="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end"
      @submit.prevent="crearUsuario"
    >
      <div>
        <label class="etiqueta" for="nuevo-usuario">Usuario</label>
        <input
          id="nuevo-usuario"
          v-model="nuevoUsuario"
          class="campo"
          type="text"
          placeholder="camila"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
        />
      </div>

      <div>
        <label class="etiqueta" for="nuevo-nombre">Nombre visible</label>
        <input
          id="nuevo-nombre"
          v-model="nuevoNombre"
          class="campo"
          type="text"
          placeholder="Camila"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="etiqueta" for="nueva-password">Contraseña</label>
        <input
          id="nueva-password"
          v-model="nuevaPassword"
          class="campo"
          type="text"
          placeholder="Mínimo 4 caracteres"
          autocomplete="new-password"
        />
      </div>

      <div>
        <label class="etiqueta" for="nueva-tienda">Tienda</label>
        <select id="nueva-tienda" v-model="nuevaTienda" class="campo">
          <option v-for="tienda in activas" :key="tienda._id" :value="tienda._id">
            {{ tienda.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="etiqueta" for="nuevo-rol">Permisos</label>
        <select id="nuevo-rol" v-model="nuevoRol" class="campo">
          <option v-for="opcion in ROLES" :key="opcion.valor" :value="opcion.valor">
            {{ opcion.etiqueta }}
          </option>
        </select>
      </div>

      <button class="btn-primario h-[42px]" type="submit" :disabled="creando">
        {{ creando ? 'Creando…' : 'Crear persona' }}
      </button>
    </form>

    <div v-if="error || exito" class="px-5 pb-5">
      <AvisoMensaje v-if="error" tipo="error" :texto="error" />
      <AvisoMensaje v-else tipo="exito" :texto="exito" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando personas…
    </p>

    <table v-else class="tabla tabla-apilable">
      <thead>
        <tr>
          <th>Persona</th>
          <th>Usuario</th>
          <th>Tienda</th>
          <th>Permisos</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <template v-for="usuario in usuarios" :key="usuario._id">
          <tr class="fila-dato">
            <td data-col="Persona">
              <span class="font-semibold">{{ usuario.displayName }}</span>
            </td>
            <td data-col="Usuario" class="text-cascara-600">{{ usuario.username }}</td>
            <td data-col="Tienda">{{ usuario.storeName || 'Sin tienda' }}</td>
            <td data-col="Permisos" class="text-cascara-600">{{ etiquetaRol(usuario.role) }}</td>

            <td data-col="" class="text-right">
              <button
                class="btn-mini"
                @click="editandoId === usuario._id ? cerrarEdicion() : abrirEdicion(usuario)"
              >
                {{ editandoId === usuario._id ? 'Cancelar' : 'Editar' }}
              </button>
            </td>
          </tr>

          <tr v-if="editandoId === usuario._id" class="fila-panel bg-kraft-100/60">
            <td colspan="5" class="px-5 py-4">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <label class="etiqueta">Nombre visible</label>
                  <input v-model="editNombre" class="campo" type="text" />
                </div>

                <div>
                  <label class="etiqueta">Tienda</label>
                  <select v-model="editTienda" class="campo">
                    <option v-for="tienda in tiendas" :key="tienda._id" :value="tienda._id">
                      {{ tienda.name }}{{ tienda.active ? '' : ' (desactivada)' }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="etiqueta">Permisos</label>
                  <select v-model="editRol" class="campo">
                    <option v-for="opcion in ROLES" :key="opcion.valor" :value="opcion.valor">
                      {{ opcion.etiqueta }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="etiqueta">Contraseña nueva</label>
                  <input
                    v-model="editPassword"
                    class="campo"
                    type="text"
                    placeholder="Dejar vacío para no cambiarla"
                    autocomplete="new-password"
                  />
                </div>

                <button
                  class="btn-primario h-[42px]"
                  :disabled="guardando"
                  @click="guardarEdicion(usuario._id)"
                >
                  Guardar
                </button>
              </div>

              <p v-if="usuario.username === sesion?.username" class="mt-3 text-[13px] text-cascara-600">
                Es tu propia cuenta: no puedes quitarte el rol de administrador.
              </p>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <p class="border-t border-kraft-200 px-5 py-3.5 text-[13px] text-cascara-600">
      Cambiar a alguien de tienda exige que no le quede stock: primero traspásalo o corrígelo. Sus
      ventas quedan registradas en la tienda donde ocurrieron.
    </p>
  </section>
</template>
