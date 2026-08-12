<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { formatearMedida, formatearMoneda, formatearNumero } from '@/lib/format'
import type { Producto, Usuario } from '@/lib/tipos'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

const props = defineProps<{
  productos: Producto[]
  usuarios: Usuario[]
  cargando: boolean
}>()

const error = ref('')

type Panel = 'recibir' | 'traspasar'
const panelAbierto = ref<{ id: Id<'products'>; panel: Panel } | null>(null)

const cantidad = ref<number | null>(null)
const destinatarioId = ref<string>('')
const origenId = ref<string>('')

const { mutate: recibir, isPending: recibiendo } = useConvexMutation(api.products.receiveStock)
const { mutate: traspasar, isPending: traspasando } = useConvexMutation(api.products.transferStock)

const primerUsuario = computed(() => props.usuarios[0]?._id ?? '')

function stockDe(producto: Producto, userId: string): number {
  return producto.stocks.find((fila) => fila.userId === userId)?.quantity ?? 0
}

function abrir(producto: Producto, panel: Panel) {
  error.value = ''
  cantidad.value = null
  panelAbierto.value = { id: producto._id, panel }

  if (panel === 'recibir') {
    destinatarioId.value = primerUsuario.value
  } else {
    // Por defecto se traspasa desde quien tenga unidades.
    const conStock = producto.stocks.find((fila) => fila.quantity > 0)
    origenId.value = conStock?.userId ?? primerUsuario.value
    destinatarioId.value =
      props.usuarios.find((u) => u._id !== origenId.value)?._id ?? primerUsuario.value
  }
}

function cerrar() {
  panelAbierto.value = null
  cantidad.value = null
  error.value = ''
}

function estaAbierto(producto: Producto, panel: Panel): boolean {
  return panelAbierto.value?.id === producto._id && panelAbierto.value.panel === panel
}

function cantidadValida(): boolean {
  if (cantidad.value === null || !Number.isInteger(cantidad.value) || cantidad.value <= 0) {
    error.value = 'La cantidad debe ser un número entero mayor a 0.'
    return false
  }
  return true
}

async function confirmarRecepcion(id: Id<'products'>) {
  error.value = ''
  if (!destinatarioId.value) {
    error.value = 'Elige a quién se le entrega.'
    return
  }
  if (!cantidadValida()) return

  try {
    await recibir({
      token: token.value,
      id,
      userId: destinatarioId.value as Id<'users'>,
      quantity: cantidad.value!,
    })
    cerrar()
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}

async function confirmarTraspaso(id: Id<'products'>) {
  error.value = ''
  if (!origenId.value || !destinatarioId.value) {
    error.value = 'Elige de quién sale y a quién llega.'
    return
  }
  if (origenId.value === destinatarioId.value) {
    error.value = 'Elige dos personas distintas.'
    return
  }
  if (!cantidadValida()) return

  try {
    await traspasar({
      token: token.value,
      id,
      fromUserId: origenId.value as Id<'users'>,
      toUserId: destinatarioId.value as Id<'users'>,
      quantity: cantidad.value!,
    })
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
      <span class="rotulo">
        {{ productos.length }} {{ productos.length === 1 ? 'producto' : 'productos' }}
      </span>
    </div>

    <div v-if="error" class="px-5 pt-4">
      <AvisoMensaje tipo="error" :texto="error" />
    </div>

    <p v-if="cargando" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando inventario…
    </p>

    <p
      v-else-if="productos.length === 0"
      class="px-5 py-10 text-center text-[14px] text-cascara-600"
    >
      No hay productos en el catálogo. Créalos en la pantalla Productos.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="tabla tabla-apilable">
        <thead>
          <tr>
            <th>Producto</th>
            <th class="num">Cantidad</th>
            <th class="num">Precio</th>
            <th v-for="usuario in usuarios" :key="usuario._id" class="num">
              {{ usuario.displayName }}
            </th>
            <th class="num">Total</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <template v-for="producto in productos" :key="producto._id">
            <tr class="fila-dato" :class="producto.total === 0 ? 'bg-piel-600/4' : ''">
              <td data-col="Producto" class="font-semibold">{{ producto.name }}</td>
              <td data-col="Cantidad" class="num text-cascara-600">
                {{ formatearMedida(producto.size, producto.unit) }}
              </td>
              <td data-col="Precio" class="num">{{ formatearMoneda(producto.price) }}</td>

              <td
                v-for="usuario in usuarios"
                :key="usuario._id"
                :data-col="usuario.displayName"
                class="num tabular-nums"
                :class="
                  stockDe(producto, usuario._id) === 0 ? 'text-cascara-500' : 'text-tostado-900'
                "
              >
                {{ formatearNumero(stockDe(producto, usuario._id)) }}
              </td>

              <td data-col="Total" class="num">
                <span
                  class="inline-flex items-baseline gap-1.5 font-semibold tabular-nums"
                  :class="producto.total === 0 ? 'text-piel-600' : 'text-tostado-900'"
                >
                  {{ formatearNumero(producto.total) }}
                  <span v-if="producto.total === 0" class="rotulo text-piel-600">agotado</span>
                  <span v-else-if="producto.total <= 5" class="rotulo text-cascara-600">
                    queda poco
                  </span>
                </span>
              </td>

              <td data-col="" class="text-right">
                <div class="flex flex-wrap justify-end gap-1.5">
                  <button class="btn-mini" @click="abrir(producto, 'recibir')">Recibir</button>
                  <button
                    class="btn-mini"
                    :disabled="producto.total === 0 || usuarios.length < 2"
                    @click="abrir(producto, 'traspasar')"
                  >
                    Traspasar
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="estaAbierto(producto, 'recibir')" class="fila-panel bg-kraft-100">
              <td :colspan="usuarios.length + 5" class="px-5 py-4">
                <div class="flex flex-wrap items-end gap-3">
                  <div>
                    <label class="etiqueta" :for="`cant-${producto._id}`">Unidades</label>
                    <input
                      :id="`cant-${producto._id}`"
                      v-model.number="cantidad"
                      class="campo w-28 py-1.5"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="10"
                      @keyup.enter="confirmarRecepcion(producto._id)"
                    />
                  </div>
                  <div>
                    <label class="etiqueta" :for="`para-${producto._id}`">Se las lleva</label>
                    <select
                      :id="`para-${producto._id}`"
                      v-model="destinatarioId"
                      class="campo w-44 py-1.5"
                    >
                      <option v-for="u in usuarios" :key="u._id" :value="u._id">
                        {{ u.displayName }}
                      </option>
                    </select>
                  </div>
                  <button
                    class="btn-mini-fuerte h-[38px]"
                    :disabled="recibiendo"
                    @click="confirmarRecepcion(producto._id)"
                  >
                    Recibir stock
                  </button>
                  <button class="btn-mini h-[38px]" @click="cerrar">Cancelar</button>
                </div>
              </td>
            </tr>

            <tr v-if="estaAbierto(producto, 'traspasar')" class="fila-panel bg-kraft-100">
              <td :colspan="usuarios.length + 5" class="px-5 py-4">
                <div class="flex flex-wrap items-end gap-3">
                  <div>
                    <label class="etiqueta" :for="`de-${producto._id}`">Sale de</label>
                    <select :id="`de-${producto._id}`" v-model="origenId" class="campo w-44 py-1.5">
                      <option v-for="u in usuarios" :key="u._id" :value="u._id">
                        {{ u.displayName }} ({{ formatearNumero(stockDe(producto, u._id)) }})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="etiqueta" :for="`a-${producto._id}`">Llega a</label>
                    <select :id="`a-${producto._id}`" v-model="destinatarioId" class="campo w-44 py-1.5">
                      <option v-for="u in usuarios" :key="u._id" :value="u._id">
                        {{ u.displayName }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="etiqueta" :for="`cantt-${producto._id}`">Unidades</label>
                    <input
                      :id="`cantt-${producto._id}`"
                      v-model.number="cantidad"
                      class="campo w-28 py-1.5"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="5"
                      @keyup.enter="confirmarTraspaso(producto._id)"
                    />
                  </div>
                  <button
                    class="btn-mini-fuerte h-[38px]"
                    :disabled="traspasando"
                    @click="confirmarTraspaso(producto._id)"
                  >
                    Traspasar
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
