<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { formatearMoneda, formatearNumero } from '@/lib/format'
import { token } from '@/lib/sesion'
import StockTable from '@/components/StockTable.vue'

const { data: productos, isPending } = useConvexQuery(api.products.list, () => ({
  token: token.value,
}))

const lista = computed(() => productos.value ?? [])
const unidadesTotales = computed(() => lista.value.reduce((suma, p) => suma + p.stock, 0))
const valorInventario = computed(() =>
  lista.value.reduce((suma, p) => suma + p.price * p.stock, 0),
)
const sinStock = computed(() => lista.value.filter((p) => p.stock === 0).length)

const resumen = computed(() => [
  { titulo: 'Productos', valor: formatearNumero(lista.value.length) },
  { titulo: 'Unidades en stock', valor: formatearNumero(unidadesTotales.value) },
  { titulo: 'Valor del inventario', valor: formatearMoneda(valorInventario.value) },
  { titulo: 'Sin stock', valor: formatearNumero(sinStock.value), alerta: sinStock.value > 0 },
])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-cascara-900">Inventario</h2>
      <p class="text-cascara-600">
        Cuánto queda de cada producto. Usa "+ Stock" cuando llegue mercadería.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="dato in resumen" :key="dato.titulo" class="tarjeta px-5 py-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-cascara-600">
          {{ dato.titulo }}
        </p>
        <p
          class="mt-1 text-2xl font-bold"
          :class="dato.alerta ? 'text-piel-600' : 'text-cascara-800'"
        >
          {{ dato.valor }}
        </p>
      </div>
    </div>

    <StockTable :productos="lista" :cargando="isPending" />
  </div>
</template>
