<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { formatearFecha, formatearMoneda, formatearNumero, nombreCompleto } from '@/lib/format'
import { token } from '@/lib/sesion'

const { data: ventas, isPending } = useConvexQuery(api.sales.list, () => ({ token: token.value }))

const lista = computed(() => ventas.value ?? [])
const recaudado = computed(() => lista.value.reduce((suma, venta) => suma + venta.total, 0))
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Ventas recientes</h2>
      <span v-if="lista.length > 0" class="rotulo">
        {{ formatearNumero(lista.length) }} {{ lista.length === 1 ? 'venta' : 'ventas' }} ·
        {{ formatearMoneda(recaudado) }}
      </span>
    </div>

    <p v-if="isPending" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando ventas…
    </p>

    <p v-else-if="lista.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Aquí aparecerán las ventas a medida que las registres.
    </p>

    <ul v-else class="divide-y divide-kraft-200">
      <li v-for="venta in lista" :key="venta._id" class="px-5 py-4">
        <div class="flex items-baseline justify-between gap-4">
          <p class="rotulo">
            {{ formatearFecha(venta._creationTime) }}
            <span v-if="venta.sellerName" class="normal-case text-cascara-500">
              · {{ venta.sellerName }}
            </span>
          </p>
          <p class="font-display text-[19px] font-bold tabular-nums tracking-[-0.02em]">
            {{ formatearMoneda(venta.total) }}
          </p>
        </div>

        <ul class="mt-2 space-y-1">
          <li
            v-for="(item, indice) in venta.items"
            :key="`${venta._id}-${indice}`"
            class="flex justify-between gap-4 text-[14px] text-tostado-700"
          >
            <span>
              <span class="font-semibold tabular-nums">{{ item.quantity }}×</span>
              {{ nombreCompleto(item.name, item.size, item.unit) }}
              <span class="text-cascara-600">a {{ formatearMoneda(item.price) }}</span>
            </span>
            <span class="tabular-nums">{{ formatearMoneda(item.price * item.quantity) }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>
