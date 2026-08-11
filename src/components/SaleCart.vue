<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatearMoneda, formatearNumero } from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import AvisoMensaje from './AvisoMensaje.vue'

const props = defineProps<{
  productos: Doc<'products'>[]
  cargando: boolean
}>()

interface LineaCarrito {
  productId: Id<'products'>
  quantity: number
}

const carrito = ref<LineaCarrito[]>([])
const seleccionId = ref<string>('')
const cantidad = ref<number | null>(1)

const error = ref('')
const exito = ref('')

const { mutate: registrar, isPending } = useConvexMutation(api.sales.create)

const productosPorId = computed(
  () => new Map(props.productos.map((producto) => [producto._id as string, producto])),
)

/** Si un producto se elimina del inventario, sale también del carrito. */
watch(
  () => props.productos,
  () => {
    if (props.cargando) return
    const antes = carrito.value.length
    carrito.value = carrito.value.filter((linea) => productosPorId.value.has(linea.productId))
    if (carrito.value.length !== antes) {
      error.value = 'Se quitaron del carrito productos que ya no están en el inventario.'
    }
  },
)

function enCarrito(id: string): number {
  return carrito.value
    .filter((linea) => linea.productId === id)
    .reduce((suma, linea) => suma + linea.quantity, 0)
}

function disponible(producto: Doc<'products'>): number {
  return producto.stock - enCarrito(producto._id)
}

const detalle = computed(() =>
  carrito.value.flatMap((linea) => {
    const producto = productosPorId.value.get(linea.productId)
    if (!producto) return []
    return [
      {
        productId: linea.productId,
        name: producto.name,
        price: producto.price,
        stock: producto.stock,
        quantity: linea.quantity,
        subtotal: producto.price * linea.quantity,
      },
    ]
  }),
)

const total = computed(() => detalle.value.reduce((suma, linea) => suma + linea.subtotal, 0))
const unidades = computed(() => detalle.value.reduce((suma, linea) => suma + linea.quantity, 0))

function agregarLinea() {
  error.value = ''
  exito.value = ''

  const producto = productosPorId.value.get(seleccionId.value)
  if (!producto) {
    error.value = 'Elige un producto.'
    return
  }
  if (cantidad.value === null || !Number.isInteger(cantidad.value) || cantidad.value <= 0) {
    error.value = 'La cantidad debe ser un número entero mayor a 0.'
    return
  }
  const libre = disponible(producto)
  if (cantidad.value > libre) {
    error.value =
      libre <= 0
        ? `"${producto.name}" no tiene stock disponible.`
        : `Solo quedan ${libre} unidades disponibles de "${producto.name}".`
    return
  }

  const existente = carrito.value.find((linea) => linea.productId === producto._id)
  if (existente) {
    existente.quantity += cantidad.value
  } else {
    carrito.value.push({ productId: producto._id, quantity: cantidad.value })
  }

  seleccionId.value = ''
  cantidad.value = 1
}

function cambiarCantidad(productId: string, nuevaCantidad: number) {
  const producto = productosPorId.value.get(productId)
  const linea = carrito.value.find((l) => l.productId === productId)
  if (!producto || !linea) return

  if (!Number.isInteger(nuevaCantidad) || nuevaCantidad <= 0) {
    linea.quantity = 1
    return
  }
  linea.quantity = Math.min(nuevaCantidad, producto.stock)
  if (nuevaCantidad > producto.stock) {
    error.value = `Solo hay ${producto.stock} unidades de "${producto.name}".`
  }
}

function quitarLinea(productId: string) {
  carrito.value = carrito.value.filter((linea) => linea.productId !== productId)
  error.value = ''
}

function vaciar() {
  carrito.value = []
  error.value = ''
  exito.value = ''
}

async function registrarVenta() {
  error.value = ''
  exito.value = ''

  if (detalle.value.length === 0) {
    error.value = 'Agrega al menos un producto al carrito.'
    return
  }

  const totalVenta = total.value
  try {
    await registrar({
      items: carrito.value.map((linea) => ({
        productId: linea.productId,
        quantity: linea.quantity,
      })),
    })
    carrito.value = []
    exito.value = `Venta registrada por ${formatearMoneda(totalVenta)}. El stock ya fue descontado.`
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="tarjeta p-5">
    <h2 class="mb-4 text-lg font-bold text-cascara-800">Nueva venta</h2>

    <p v-if="cargando" class="py-6 text-center text-cascara-600">Cargando productos…</p>

    <p v-else-if="productos.length === 0" class="py-6 text-center text-cascara-600">
      No hay productos en el inventario. Agrega productos antes de vender.
    </p>

    <template v-else>
      <form
        class="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        @submit.prevent="agregarLinea"
      >
        <div>
          <label class="etiqueta" for="producto">Producto</label>
          <select id="producto" v-model="seleccionId" class="campo">
            <option value="">Selecciona un producto…</option>
            <option
              v-for="producto in productos"
              :key="producto._id"
              :value="producto._id"
              :disabled="disponible(producto) <= 0"
            >
              {{ producto.name }} — {{ formatearMoneda(producto.price) }} ({{
                formatearNumero(disponible(producto))
              }}
              disp.)
            </option>
          </select>
        </div>

        <div>
          <label class="etiqueta" for="cantidad">Cantidad</label>
          <input
            id="cantidad"
            v-model.number="cantidad"
            class="campo"
            type="number"
            min="1"
            step="1"
          />
        </div>

        <button class="btn-suave h-[42px]" type="submit">Agregar al carrito</button>
      </form>

      <div v-if="error || exito" class="mt-4 space-y-2">
        <AvisoMensaje v-if="error" tipo="error" :texto="error" />
        <AvisoMensaje v-if="exito" tipo="exito" :texto="exito" />
      </div>

      <div class="mt-6 rounded-xl border border-cascara-200 bg-white/70">
        <p v-if="detalle.length === 0" class="px-4 py-8 text-center text-sm text-cascara-600">
          El carrito está vacío.
        </p>

        <table v-else class="w-full text-left text-sm">
          <thead class="border-b border-cascara-200 text-xs uppercase tracking-wide text-cascara-700">
            <tr>
              <th class="px-4 py-2 font-semibold">Producto</th>
              <th class="px-4 py-2 text-right font-semibold">Precio</th>
              <th class="px-4 py-2 text-center font-semibold">Cantidad</th>
              <th class="px-4 py-2 text-right font-semibold">Subtotal</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cascara-200">
            <tr v-for="linea in detalle" :key="linea.productId">
              <td class="px-4 py-2 font-medium text-cascara-900">{{ linea.name }}</td>
              <td class="px-4 py-2 text-right">{{ formatearMoneda(linea.price) }}</td>
              <td class="px-4 py-2 text-center">
                <input
                  class="campo mx-auto w-20 py-1 text-center"
                  type="number"
                  min="1"
                  :max="linea.stock"
                  step="1"
                  :value="linea.quantity"
                  @change="
                    cambiarCantidad(
                      linea.productId,
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </td>
              <td class="px-4 py-2 text-right font-semibold">
                {{ formatearMoneda(linea.subtotal) }}
              </td>
              <td class="px-4 py-2 text-right">
                <button class="btn-mini border-piel-400/50 text-piel-600 hover:bg-piel-500/10"
                  @click="quitarLinea(linea.productId)">
                  Quitar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-cascara-600">
            Total ({{ formatearNumero(unidades) }}
            {{ unidades === 1 ? 'unidad' : 'unidades' }})
          </p>
          <p class="text-3xl font-bold text-cascara-800">{{ formatearMoneda(total) }}</p>
        </div>

        <div class="flex gap-2">
          <button class="btn-suave" :disabled="detalle.length === 0 || isPending" @click="vaciar">
            Vaciar
          </button>
          <button
            class="btn-venta"
            :disabled="detalle.length === 0 || isPending"
            @click="registrarVenta"
          >
            {{ isPending ? 'Registrando…' : 'Registrar venta' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
