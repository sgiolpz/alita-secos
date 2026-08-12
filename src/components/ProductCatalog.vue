<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  UNIDADES,
  formatearMedida,
  formatearMoneda,
  formatearNumero,
  type UnidadProducto,
} from '@/lib/format'
import type { Producto } from '@/lib/tipos'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

defineProps<{
  productos: Producto[]
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

function abrirEdicion(producto: Producto) {
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
    error.value = 'Indica la cantidad del producto.'
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
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Catálogo</h2>
      <span class="rotulo">
        {{ productos.length }} {{ productos.length === 1 ? 'producto' : 'productos' }}
      </span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando catálogo…
    </p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Crea el primer producto con el formulario de arriba.
    </p>

    <table v-else class="tabla tabla-apilable">
      <thead>
        <tr>
          <th>Producto</th>
          <th class="num">Cantidad</th>
          <th class="num">Precio</th>
          <th class="num">Stock</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <template v-for="producto in productos" :key="producto._id">
          <tr class="fila-dato">
            <td data-col="Producto">
              <input
                v-if="editandoId === producto._id"
                v-model="editNombre"
                class="campo py-1.5"
                type="text"
                aria-label="Nombre"
              />
              <span v-else class="font-semibold">{{ producto.name }}</span>
            </td>

            <td data-col="Cantidad" class="num">
              <div v-if="editandoId === producto._id" class="flex justify-end gap-1.5">
                <input
                  v-model.number="editPeso"
                  class="campo w-20 py-1.5 text-right"
                  type="number"
                  min="1"
                  step="1"
                  aria-label="Cantidad"
                />
                <select v-model="editUnidad" class="campo w-28 py-1.5" aria-label="Unidad">
                  <option v-for="o in UNIDADES" :key="o.valor" :value="o.valor">
                    {{ o.etiqueta }}
                  </option>
                </select>
              </div>
              <span v-else class="text-cascara-600">
                {{ formatearMedida(producto.size, producto.unit) }}
              </span>
            </td>

            <td data-col="Precio" class="num">
              <input
                v-if="editandoId === producto._id"
                v-model.number="editPrecio"
                class="campo w-28 py-1.5 text-right"
                type="number"
                min="0"
                step="1"
                aria-label="Precio"
              />
              <span v-else>{{ formatearMoneda(producto.price) }}</span>
            </td>

            <td data-col="Stock" class="num text-cascara-600">
              {{ formatearNumero(producto.total) }}
            </td>

            <td data-col="" class="text-right">
              <div class="flex flex-wrap justify-end gap-1.5">
                <template v-if="editandoId === producto._id">
                  <button
                    class="btn-mini-fuerte"
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
                    class="btn-mini-riesgo"
                    @click="eliminandoId = eliminandoId === producto._id ? null : producto._id"
                  >
                    Eliminar
                  </button>
                </template>
              </div>
            </td>
          </tr>

          <tr v-if="eliminandoId === producto._id" class="fila-panel bg-piel-600/5">
            <td colspan="5" class="px-5 py-4">
              <div class="flex flex-wrap items-center gap-3">
                <span class="text-[14px] text-piel-700">
                  Se elimina "{{ producto.name }}" del catálogo.
                  <template v-if="producto.total > 0">
                    Se pierden {{ formatearNumero(producto.total) }} unidades repartidas entre las
                    personas.
                  </template>
                  Las ventas ya registradas se mantienen.
                </span>
                <button
                  class="btn-mini border-piel-600 bg-piel-600 text-nuez-50 hover:bg-piel-700"
                  :disabled="eliminando"
                  @click="confirmarEliminacion(producto._id)"
                >
                  Eliminar producto
                </button>
                <button class="btn-mini" @click="cerrarTodo">Cancelar</button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>
