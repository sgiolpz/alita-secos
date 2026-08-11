<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/format'

const { data: ventas, isPending } = useConvexQuery(api.sales.list)

const lista = computed(() => ventas.value ?? [])
const recaudado = computed(() => lista.value.reduce((suma, venta) => suma + venta.total, 0))
</script>

<template>
  <section class="tarjeta overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-cascara-200 px-5 py-4">
      <h2 class="text-lg font-bold text-cascara-800">Ventas recientes</h2>
      <span v-if="lista.length > 0" class="text-sm text-cascara-600">
        {{ formatearNumero(lista.length) }} {{ lista.length === 1 ? 'venta' : 'ventas' }} ·
        {{ formatearMoneda(recaudado) }}
      </span>
    </div>

    <p v-if="isPending" class="px-5 py-10 text-center text-cascara-600">Cargando ventas…</p>

    <p v-else-if="lista.length === 0" class="px-5 py-10 text-center text-cascara-600">
      Aún no se han registrado ventas.
    </p>

    <ul v-else class="divide-y divide-cascara-200">
      <li v-for="venta in lista" :key="venta._id" class="px-5 py-4">
        <div class="flex items-baseline justify-between gap-4">
          <p class="text-sm text-cascara-600">{{ formatearFecha(venta._creationTime) }}</p>
          <p class="text-lg font-bold text-cascara-800">{{ formatearMoneda(venta.total) }}</p>
        </div>

        <ul class="mt-2 space-y-1">
          <li
            v-for="(item, indice) in venta.items"
            :key="`${venta._id}-${indice}`"
            class="flex justify-between gap-4 text-sm text-cascara-700"
          >
            <span>
              <span class="font-medium">{{ item.quantity }}×</span>
              {{ item.name }}
              <span class="text-cascara-500">a {{ formatearMoneda(item.price) }}</span>
            </span>
            <span>{{ formatearMoneda(item.price * item.quantity) }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>
