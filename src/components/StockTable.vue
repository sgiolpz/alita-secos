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
    error.value = 'La cantidad a recibir debe ser un entero mayor a 0.'
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
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Stock</h2>
      <span class="rotulo">{{ productos.length }} productos</span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando inventario…
    </p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      No hay productos en el catálogo. Créalos en la pantalla Productos.
    </p>

    <div v-else>
      <table class="tabla tabla-apilable">
        <thead>
          <tr>
            <th>Producto</th>
            <th class="num">Peso</th>
            <th class="num">Precio</th>
            <th class="num">Stock</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <template v-for="producto in productos" :key="producto._id">
            <tr class="fila-dato" :class="producto.stock === 0 ? 'bg-piel-600/4' : ''">
              <td data-col="Producto" class="font-semibold">{{ producto.name }}</td>
              <td data-col="Peso" class="num text-cascara-600">
                {{ formatearMedida(producto.size, producto.unit) }}
              </td>
              <td data-col="Precio" class="num">{{ formatearMoneda(producto.price) }}</td>

              <td data-col="Stock" class="num">
                <span
                  class="inline-flex items-baseline gap-1.5 font-semibold tabular-nums"
                  :class="producto.stock === 0 ? 'text-piel-600' : 'text-tostado-900'"
                >
                  {{ formatearNumero(producto.stock) }}
                  <span v-if="producto.stock === 0" class="rotulo text-piel-600">agotado</span>
                  <span v-else-if="producto.stock <= 5" class="rotulo text-cascara-600">
                    queda poco
                  </span>
                </span>
              </td>

              <td data-col="" class="text-right">
                <button class="btn-mini" @click="abrirReposicion(producto)">Recibir stock</button>
              </td>
            </tr>

            <tr v-if="reponiendoId === producto._id" class="fila-panel bg-kraft-100">
              <td colspan="5" class="px-5 py-4">
                <div class="flex flex-wrap items-end gap-3">
                  <div>
                    <label class="etiqueta" :for="`recibir-${producto._id}`">
                      Unidades que llegaron de {{ producto.name }}
                    </label>
                    <input
                      :id="`recibir-${producto._id}`"
                      v-model.number="cantidadRepo"
                      class="campo w-32 py-1.5"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="10"
                      @keyup.enter="confirmarReposicion(producto._id)"
                    />
                  </div>
                  <button
                    class="btn-mini-fuerte h-[38px]"
                    :disabled="reponiendo"
                    @click="confirmarReposicion(producto._id)"
                  >
                    Recibir stock
                  </button>
                  <button class="btn-mini h-[38px]" @click="cerrar">Cancelar</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
