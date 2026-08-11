<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  UNIDADES,
  formatearMedida,
  formatearMoneda,
  formatearNumero,
  type UnidadProducto,
} from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

defineProps<{
  productos: Doc<'products'>[]
  cargando: boolean
}>()

const error = ref('')

const editandoId = ref<Id<'products'> | null>(null)
const editNombre = ref('')
const editPeso = ref<number | null>(null)
const editUnidad = ref<UnidadProducto>('g')
const editPrecio = ref<number | null>(null)

const eliminandoId = ref<Id<'products'> | null>(null)

const { mutate: actualizar, isPending: guardando } = useConvexMutation(api.products.update)
const { mutate: eliminar, isPending: eliminando } = useConvexMutation(api.products.remove)

function cerrarTodo() {
  editandoId.value = null
  eliminandoId.value = null
  error.value = ''
}

function abrirEdicion(producto: Doc<'products'>) {
  cerrarTodo()
  editandoId.value = producto._id
  editNombre.value = producto.name
  editPeso.value = producto.size ?? null
  editUnidad.value = producto.unit ?? 'g'
  editPrecio.value = producto.price
}

async function guardarEdicion(id: Id<'products'>) {
  error.value = ''
  if (!editNombre.value.trim()) {
    error.value = 'El nombre no puede quedar vacío.'
    return
  }
  if (editPeso.value === null || editPeso.value <= 0) {
    error.value = 'Indica el peso o la cantidad del producto.'
    return
  }
  if (editPrecio.value === null || editPrecio.value < 0) {
    error.value = 'Indica un precio válido.'
    return
  }

  try {
    await actualizar({
      token: token.value,
      id,
      name: editNombre.value.trim(),
      size: editPeso.value,
      unit: editUnidad.value,
      price: editPrecio.value,
    })
    cerrarTodo()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function confirmarEliminacion(id: Id<'products'>) {
  error.value = ''
  try {
    await eliminar({ token: token.value, id })
    cerrarTodo()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="tarjeta overflow-hidden">
    <div class="flex items-center justify-between border-b border-cascara-200 px-5 py-4">
      <h2 class="text-lg font-bold text-cascara-800">Catálogo</h2>
      <span class="text-sm text-cascara-600">{{ productos.length }} productos</span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-cascara-600">Cargando catálogo…</p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-cascara-600">
      Todavía no hay productos. Crea el primero con el formulario de arriba.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-nuez-200/60 text-xs uppercase tracking-wide text-cascara-700">
          <tr>
            <th class="px-5 py-3 font-semibold">Producto</th>
            <th class="px-5 py-3 text-right font-semibold">Peso</th>
            <th class="px-5 py-3 text-right font-semibold">Precio</th>
            <th class="px-5 py-3 text-right font-semibold">Stock</th>
            <th class="px-5 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-cascara-200">
          <template v-for="producto in productos" :key="producto._id">
            <tr>
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
                <div v-if="editandoId === producto._id" class="flex justify-end gap-1">
                  <input
                    v-model.number="editPeso"
                    class="campo w-20 py-1 text-right"
                    type="number"
                    min="1"
                    step="1"
                  />
                  <select v-model="editUnidad" class="campo w-24 py-1">
                    <option v-for="o in UNIDADES" :key="o.valor" :value="o.valor">
                      {{ o.etiqueta }}
                    </option>
                  </select>
                </div>
                <span v-else>{{ formatearMedida(producto.size, producto.unit) }}</span>
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

              <td class="px-5 py-3 text-right text-cascara-600">
                {{ formatearNumero(producto.stock) }}
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
                    <button class="btn-mini" @click="abrirEdicion(producto)">Editar</button>
                    <button
                      class="btn-mini border-piel-400/50 text-piel-600 hover:bg-piel-500/10"
                      @click="
                        eliminandoId = eliminandoId === producto._id ? null : producto._id
                      "
                    >
                      Eliminar
                    </button>
                  </template>
                </div>
              </td>
            </tr>

            <tr v-if="eliminandoId === producto._id" class="bg-piel-500/5">
              <td colspan="5" class="px-5 py-3">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-sm text-piel-700">
                    ¿Eliminar "{{ producto.name }}" del catálogo?
                    <template v-if="producto.stock > 0">
                      Tiene {{ formatearNumero(producto.stock) }} unidades en stock.
                    </template>
                    Las ventas ya registradas se mantienen.
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
