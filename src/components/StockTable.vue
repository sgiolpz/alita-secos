<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatearMedida, formatearMoneda, formatearNumero } from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

defineProps<{
  productos: Doc<'products'>[]
  cargando: boolean
}>()

const error = ref('')
const reponiendoId = ref<Id<'products'> | null>(null)
const cantidadRepo = ref<number | null>(null)

const { mutate: reponer, isPending: reponiendo } = useConvexMutation(api.products.addStock)

function abrirReposicion(producto: Doc<'products'>) {
  error.value = ''
  reponiendoId.value = producto._id
  cantidadRepo.value = null
}

function cerrar() {
  reponiendoId.value = null
  cantidadRepo.value = null
  error.value = ''
}

async function confirmarReposicion(id: Id<'products'>) {
  error.value = ''
  if (
    cantidadRepo.value === null ||
    !Number.isInteger(cantidadRepo.value) ||
    cantidadRepo.value <= 0
  ) {
    error.value = 'La cantidad a reponer debe ser un entero mayor a 0.'
    return
  }
  try {
    await reponer({ token: token.value, id, quantity: cantidadRepo.value })
    cerrar()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="tarjeta overflow-hidden">
    <div class="flex items-center justify-between border-b border-cascara-200 px-5 py-4">
      <h2 class="text-lg font-bold text-cascara-800">Stock</h2>
      <span class="text-sm text-cascara-600">{{ productos.length }} productos</span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-cascara-600">Cargando inventario…</p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-cascara-600">
      No hay productos en el catálogo. Créalos en la pantalla Productos.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-nuez-200/60 text-xs uppercase tracking-wide text-cascara-700">
          <tr>
            <th class="px-5 py-3 font-semibold">Producto</th>
            <th class="px-5 py-3 text-right font-semibold">Peso</th>
            <th class="px-5 py-3 text-right font-semibold">Precio</th>
            <th class="px-5 py-3 text-right font-semibold">Stock</th>
            <th class="px-5 py-3 text-right font-semibold"></th>
          </tr>
        </thead>

        <tbody class="divide-y divide-cascara-200">
          <template v-for="producto in productos" :key="producto._id">
            <tr :class="producto.stock === 0 ? 'bg-piel-500/5' : ''">
              <td class="px-5 py-3 font-medium text-cascara-900">{{ producto.name }}</td>
              <td class="px-5 py-3 text-right text-cascara-700">
                {{ formatearMedida(producto.size, producto.unit) }}
              </td>
              <td class="px-5 py-3 text-right">{{ formatearMoneda(producto.price) }}</td>

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
                  <span v-else-if="producto.stock <= 5" class="ml-1 font-semibold">
                    · queda poco
                  </span>
                </span>
              </td>

              <td class="px-5 py-3 text-right">
                <button class="btn-mini" @click="abrirReposicion(producto)">+ Stock</button>
              </td>
            </tr>

            <tr v-if="reponiendoId === producto._id" class="bg-nuez-200/40">
              <td colspan="5" class="px-5 py-3">
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
                  <button class="btn-mini" @click="cerrar">Cancelar</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
