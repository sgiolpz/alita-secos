<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatearMoneda, formatearNumero } from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import AvisoMensaje from './AvisoMensaje.vue'

defineProps<{
  productos: Doc<'products'>[]
  cargando: boolean
}>()

const error = ref('')

const editandoId = ref<Id<'products'> | null>(null)
const editNombre = ref('')
const editPrecio = ref<number | null>(null)

const reponiendoId = ref<Id<'products'> | null>(null)
const cantidadRepo = ref<number | null>(null)

const eliminandoId = ref<Id<'products'> | null>(null)

const { mutate: actualizar, isPending: guardando } = useConvexMutation(api.products.update)
const { mutate: reponer, isPending: reponiendo } = useConvexMutation(api.products.addStock)
const { mutate: eliminar, isPending: eliminando } = useConvexMutation(api.products.remove)

function cerrarTodo() {
  editandoId.value = null
  reponiendoId.value = null
  eliminandoId.value = null
  cantidadRepo.value = null
  error.value = ''
}

function abrirEdicion(producto: Doc<'products'>) {
  cerrarTodo()
  editandoId.value = producto._id
  editNombre.value = producto.name
  editPrecio.value = producto.price
}

function abrirReposicion(producto: Doc<'products'>) {
  cerrarTodo()
  reponiendoId.value = producto._id
  cantidadRepo.value = null
}

function abrirEliminacion(producto: Doc<'products'>) {
  cerrarTodo()
  eliminandoId.value = producto._id
}

async function guardarEdicion(id: Id<'products'>) {
  error.value = ''
  if (!editNombre.value.trim()) {
    error.value = 'El nombre no puede quedar vacío.'
    return
  }
  if (editPrecio.value === null || editPrecio.value < 0) {
    error.value = 'Indica un precio válido.'
    return
  }
  try {
    await actualizar({ id, name: editNombre.value.trim(), price: editPrecio.value })
    cerrarTodo()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function confirmarReposicion(id: Id<'products'>) {
  error.value = ''
  if (cantidadRepo.value === null || !Number.isInteger(cantidadRepo.value) || cantidadRepo.value <= 0) {
    error.value = 'La cantidad a reponer debe ser un entero mayor a 0.'
    return
  }
  try {
    await reponer({ id, quantity: cantidadRepo.value })
    cerrarTodo()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function confirmarEliminacion(id: Id<'products'>) {
  error.value = ''
  try {
    await eliminar({ id })
    cerrarTodo()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="tarjeta overflow-hidden">
    <div class="flex items-center justify-between border-b border-cascara-200 px-5 py-4">
      <h2 class="text-lg font-bold text-cascara-800">Productos</h2>
      <span class="text-sm text-cascara-600">{{ productos.length }} en catálogo</span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-cascara-600">Cargando inventario…</p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-cascara-600">
      Todavía no hay productos. Agrega el primero con el formulario de arriba.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-nuez-200/60 text-xs uppercase tracking-wide text-cascara-700">
          <tr>
            <th class="px-5 py-3 font-semibold">Producto</th>
            <th class="px-5 py-3 text-right font-semibold">Precio</th>
            <th class="px-5 py-3 text-right font-semibold">Stock</th>
            <th class="px-5 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-cascara-200">
          <template v-for="producto in productos" :key="producto._id">
            <tr class="align-middle" :class="producto.stock === 0 ? 'bg-piel-500/5' : ''">
              <td class="px-5 py-3">
                <input
                  v-if="editandoId === producto._id"
                  v-model="editNombre"
                  class="campo py-1"
                  type="text"
                />
                <span v-else class="font-medium text-cascara-900">{{ producto.name }}</span>
              </td>

              <td class="px-5 py-3 text-right">
                <input
                  v-if="editandoId === producto._id"
                  v-model.number="editPrecio"
                  class="campo w-28 py-1 text-right"
                  type="number"
                  min="0"
                  step="1"
                />
                <span v-else>{{ formatearMoneda(producto.price) }}</span>
              </td>

              <td class="px-5 py-3 text-right">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                  :class="
                    producto.stock === 0
                      ? 'bg-piel-500/15 text-piel-700'
                      : producto.stock <= 5
                        ? 'bg-cascara-400/25 text-cascara-800'
                        : 'bg-cascara-200/70 text-cascara-800'
                  "
                >
                  {{ formatearNumero(producto.stock) }}
                  <span v-if="producto.stock === 0" class="ml-1 font-semibold">· sin stock</span>
                  <span v-else-if="producto.stock <= 5" class="ml-1 font-semibold">· queda poco</span>
                </span>
              </td>

              <td class="px-5 py-3">
                <div class="flex flex-wrap justify-end gap-1.5">
                  <template v-if="editandoId === producto._id">
                    <button
                      class="btn-mini border-cascara-600 bg-cascara-600 text-white hover:bg-cascara-700"
                      :disabled="guardando"
                      @click="guardarEdicion(producto._id)"
                    >
                      Guardar
                    </button>
                    <button class="btn-mini" @click="cerrarTodo">Cancelar</button>
                  </template>

                  <template v-else>
                    <button class="btn-mini" @click="abrirReposicion(producto)">+ Stock</button>
                    <button class="btn-mini" @click="abrirEdicion(producto)">Editar</button>
                    <button
                      class="btn-mini border-piel-400/50 text-piel-600 hover:bg-piel-500/10"
                      @click="abrirEliminacion(producto)"
                    >
                      Eliminar
                    </button>
                  </template>
                </div>
              </td>
            </tr>

            <tr v-if="reponiendoId === producto._id" class="bg-nuez-200/40">
              <td colspan="4" class="px-5 py-3">
                <div class="flex flex-wrap items-center gap-3">
                  <label class="text-sm font-medium text-cascara-700">
                    Unidades a agregar a "{{ producto.name }}"
                  </label>
                  <input
                    v-model.number="cantidadRepo"
                    class="campo w-28 py-1"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="10"
                    @keyup.enter="confirmarReposicion(producto._id)"
                  />
                  <button
                    class="btn-mini border-cascara-600 bg-cascara-600 text-white hover:bg-cascara-700"
                    :disabled="reponiendo"
                    @click="confirmarReposicion(producto._id)"
                  >
                    Agregar al stock
                  </button>
                  <button class="btn-mini" @click="cerrarTodo">Cancelar</button>
                </div>
              </td>
            </tr>

            <tr v-if="eliminandoId === producto._id" class="bg-piel-500/5">
              <td colspan="4" class="px-5 py-3">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-sm text-piel-700">
                    ¿Eliminar "{{ producto.name }}" del inventario? Las ventas ya registradas se
                    mantienen.
                  </span>
                  <button
                    class="btn-mini border-piel-500 bg-piel-500 text-white hover:bg-piel-600"
                    :disabled="eliminando"
                    @click="confirmarEliminacion(producto._id)"
                  >
                    Sí, eliminar
                  </button>
                  <button class="btn-mini" @click="cerrarTodo">Cancelar</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
