<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { formatearMoneda, formatearNumero, nombreCompleto } from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
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

/** Si un producto se elimina del catálogo, sale también del carrito. */
watch(
  () => props.productos,
  () => {
    if (props.cargando) return
    const antes = carrito.value.length
    carrito.value = carrito.value.filter((linea) => productosPorId.value.has(linea.productId))
    if (carrito.value.length !== antes) {
      error.value = 'Se quitaron del carrito productos que ya no están en el catálogo.'
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
        name: nombreCompleto(producto.name, producto.size, producto.unit),
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
      token: token.value,
      items: carrito.value.map((linea) => ({
        productId: linea.productId,
        quantity: linea.quantity,
      })),
    })
    carrito.value = []
    exito.value = `Venta registrada: ${formatearMoneda(totalVenta)}. Stock descontado.`
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Nueva venta</h2>
      <span v-if="detalle.length > 0" class="rotulo">
        {{ formatearNumero(unidades) }} {{ unidades === 1 ? 'unidad' : 'unidades' }}
      </span>
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando productos…
    </p>

    <p v-else-if="productos.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      No hay productos en el catálogo. Créalos en Productos y cárgales stock en Inventario.
    </p>

    <template v-else>
      <form
        class="grid gap-4 px-5 py-5 sm:grid-cols-[2fr_140px_auto] sm:items-end"
        @submit.prevent="agregarLinea"
      >
        <div>
          <label class="etiqueta" for="producto">Producto</label>
          <select id="producto" v-model="seleccionId" class="campo">
            <option value="">Elige un producto…</option>
            <option
              v-for="producto in productos"
              :key="producto._id"
              :value="producto._id"
              :disabled="disponible(producto) <= 0"
            >
              {{ nombreCompleto(producto.name, producto.size, producto.unit) }} —
              {{ formatearMoneda(producto.price) }} ({{ formatearNumero(disponible(producto)) }}
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

      <div v-if="error || exito" class="space-y-2 px-5 pb-5">
        <AvisoMensaje v-if="error" tipo="error" :texto="error" />
        <AvisoMensaje v-if="exito" tipo="exito" :texto="exito" />
      </div>

      <p
        v-if="detalle.length === 0"
        class="border-t border-kraft-200 px-5 py-10 text-center text-[14px] text-cascara-600"
      >
        Elige un producto para empezar la venta.
      </p>

      <table v-else class="tabla tabla-apilable border-t border-kraft-200">
        <thead>
          <tr>
            <th>Producto</th>
            <th class="num">Precio</th>
            <th class="w-32 text-center">Cantidad</th>
            <th class="num">Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="linea in detalle" :key="linea.productId" class="fila-dato">
            <td data-col="Producto" class="font-semibold">{{ linea.name }}</td>
            <td data-col="Precio" class="num text-cascara-600">
              {{ formatearMoneda(linea.price) }}
            </td>
            <td data-col="Cantidad" class="text-center">
              <input
                class="campo w-20 py-1 text-center sm:mx-auto"
                type="number"
                min="1"
                :max="linea.stock"
                step="1"
                :value="linea.quantity"
                :aria-label="`Cantidad de ${linea.name}`"
                @change="
                  cambiarCantidad(linea.productId, Number(($event.target as HTMLInputElement).value))
                "
              />
            </td>
            <td data-col="Subtotal" class="num font-semibold">
              {{ formatearMoneda(linea.subtotal) }}
            </td>
            <td data-col="" class="text-right">
              <button class="btn-mini-riesgo" @click="quitarLinea(linea.productId)">Quitar</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="ticket mt-3 flex flex-col gap-5 px-5 pb-5 pt-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="rotulo text-cascara-400">Total a cobrar</p>
          <p class="ticket-monto mt-1.5">{{ formatearMoneda(total) }}</p>
        </div>

        <div class="flex gap-2">
          <button
            class="btn-ticket-suave"
            type="button"
            :disabled="detalle.length === 0 || isPending"
            @click="vaciar"
          >
            Vaciar
          </button>
          <button
            class="btn-ticket"
            type="button"
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
