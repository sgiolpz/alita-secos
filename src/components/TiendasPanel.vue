<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { formatearNumero } from '@/lib/format'
import type { Tienda } from '@/lib/tipos'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

defineProps<{
  tiendas: Tienda[]
  cargando: boolean
}>()

const nombreNueva = ref('')
const error = ref('')
const exito = ref('')

const editandoId = ref<Id<'stores'> | null>(null)
const editNombre = ref('')
const editActiva = ref(true)

const { mutate: crear, isPending: creando } = useConvexMutation(api.admin.crearTienda)
const { mutate: actualizar, isPending: guardando } = useConvexMutation(api.admin.actualizarTienda)

function cerrarEdicion() {
  editandoId.value = null
  error.value = ''
}

function abrirEdicion(tienda: Tienda) {
  error.value = ''
  exito.value = ''
  editandoId.value = tienda._id
  editNombre.value = tienda.name
  editActiva.value = tienda.active
}

async function crearTienda() {
  error.value = ''
  exito.value = ''

  const nombre = nombreNueva.value.trim()
  if (!nombre) {
    error.value = 'Escribe el nombre de la tienda.'
    return
  }

  try {
    await crear({ token: token.value, name: nombre })
    exito.value = `${nombre} creada. Ya puede vender: solo falta asignarle gente.`
    nombreNueva.value = ''
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function guardarEdicion(id: Id<'stores'>) {
  error.value = ''
  exito.value = ''

  if (!editNombre.value.trim()) {
    error.value = 'El nombre no puede quedar vacío.'
    return
  }

  try {
    await actualizar({
      token: token.value,
      id,
      name: editNombre.value.trim(),
      active: editActiva.value,
    })
    cerrarEdicion()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Tiendas</h2>
      <span class="rotulo">
        {{ tiendas.length }} {{ tiendas.length === 1 ? 'tienda' : 'tiendas' }}
      </span>
    </div>

    <form class="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-end" @submit.prevent="crearTienda">
      <div>
        <label class="etiqueta" for="tienda-nueva">Nombre de la tienda</label>
        <input
          id="tienda-nueva"
          v-model="nombreNueva"
          class="campo"
          type="text"
          placeholder="Los Nogales"
          autocomplete="off"
        />
      </div>

      <button class="btn-primario h-[42px]" type="submit" :disabled="creando">
        {{ creando ? 'Creando…' : 'Crear tienda' }}
      </button>
    </form>

    <div v-if="error || exito" class="px-5 pb-5">
      <AvisoMensaje v-if="error" tipo="error" :texto="error" />
      <AvisoMensaje v-else tipo="exito" :texto="exito" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando tiendas…
    </p>

    <table v-else class="tabla tabla-apilable">
      <thead>
        <tr>
          <th>Tienda</th>
          <th>Estado</th>
          <th class="num">Personas</th>
          <th class="num">Productos</th>
          <th class="num">Ventas</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="tienda in tiendas" :key="tienda._id" class="fila-dato">
          <td data-col="Tienda">
            <input
              v-if="editandoId === tienda._id"
              v-model="editNombre"
              class="campo py-1.5"
              type="text"
              aria-label="Nombre de la tienda"
            />
            <span v-else class="font-semibold">{{ tienda.name }}</span>
          </td>

          <td data-col="Estado">
            <label
              v-if="editandoId === tienda._id"
              class="flex items-center gap-2 text-[14px] text-tostado-800"
            >
              <input v-model="editActiva" type="checkbox" class="h-4 w-4 accent-piel-600" />
              Activa
            </label>
            <span v-else :class="tienda.active ? 'text-tostado-800' : 'text-piel-700'">
              {{ tienda.active ? 'Activa' : 'Desactivada' }}
            </span>
          </td>

          <td data-col="Personas" class="num text-cascara-600">
            {{ formatearNumero(tienda.usuarios) }}
          </td>
          <td data-col="Productos" class="num text-cascara-600">
            {{ formatearNumero(tienda.productos) }}
          </td>
          <td data-col="Ventas" class="num text-cascara-600">
            {{ formatearNumero(tienda.ventas) }}
          </td>

          <td data-col="" class="text-right">
            <div class="flex flex-wrap justify-end gap-1.5">
              <template v-if="editandoId === tienda._id">
                <button
                  class="btn-mini-fuerte"
                  :disabled="guardando"
                  @click="guardarEdicion(tienda._id)"
                >
                  Guardar
                </button>
                <button class="btn-mini" @click="cerrarEdicion">Cancelar</button>
              </template>

              <button v-else class="btn-mini" @click="abrirEdicion(tienda)">Editar</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="border-t border-kraft-200 px-5 py-3.5 text-[13px] text-cascara-600">
      Una tienda desactivada conserva su historial, pero su gente no puede entrar.
    </p>
  </section>
</template>
