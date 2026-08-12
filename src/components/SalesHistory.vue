<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import {
  claveDia,
  formatearDia,
  formatearHora,
  formatearMoneda,
  nombreCompleto,
} from '@/lib/format'
import type { Venta } from '@/lib/tipos'
import { token } from '@/lib/sesion'

const { data: ventas, isPending } = useConvexQuery(api.sales.list, () => ({ token: token.value }))

const lista = computed<Venta[]>(() => ventas.value ?? [])

interface Jornada {
  clave: string
  etiqueta: string
  ventas: Venta[]
  total: number
}

/**
 * Las ventas llegan de la más reciente a la más antigua, así que basta con
 * cortar en tramos consecutivos del mismo día. Agrupar evita repetir la fecha
 * en cada línea y da el dato que sí se mira: cuánto se vendió en la jornada.
 */
const jornadas = computed<Jornada[]>(() => {
  const grupos: Jornada[] = []

  for (const venta of lista.value) {
    const clave = claveDia(venta._creationTime)
    let jornada = grupos[grupos.length - 1]

    if (!jornada || jornada.clave !== clave) {
      jornada = { clave, etiqueta: formatearDia(venta._creationTime), ventas: [], total: 0 }
      grupos.push(jornada)
    }

    jornada.ventas.push(venta)
    jornada.total += venta.total
  }

  return grupos
})
</script>

<template>
  <section class="panel overflow-hidden">
    <!-- Sin contador acá: cada jornada trae el suyo, y repetirlo era parte de
         lo que sobraba. -->
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Ventas recientes</h2>
    </div>

    <p v-if="isPending" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando ventas…
    </p>

    <p v-else-if="lista.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Aquí aparecerán las ventas a medida que las registres.
    </p>

    <template v-else>
      <div
        v-for="(jornada, indiceJornada) in jornadas"
        :key="jornada.clave"
        :class="indiceJornada > 0 ? 'border-t border-kraft-200' : ''"
      >
        <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-kraft-200 bg-kraft-100/70 px-5 py-2"
        >
          <span class="rotulo text-tostado-800">{{ jornada.etiqueta }}</span>
          <span class="rotulo">
            {{ jornada.ventas.length }} {{ jornada.ventas.length === 1 ? 'venta' : 'ventas' }} ·
            <span class="text-tostado-800">{{ formatearMoneda(jornada.total) }}</span>
          </span>
        </div>

        <ul class="divide-y divide-kraft-200">
          <li v-for="venta in jornada.ventas" :key="venta._id" class="px-5 py-3.5">
            <div class="flex items-baseline justify-between gap-4">
              <p class="rotulo">
                {{ formatearHora(venta._creationTime) }}
                <span v-if="venta.sellerName" class="text-cascara-500">
                  · {{ venta.sellerName }}
                </span>
              </p>
              <p
                class="font-display text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums"
              >
                {{ formatearMoneda(venta.total) }}
              </p>
            </div>

            <ul class="mt-1.5 space-y-0.5">
              <li
                v-for="(item, indice) in venta.items"
                :key="`${venta._id}-${indice}`"
                class="flex items-baseline justify-between gap-4 text-[14px]"
              >
                <span class="text-tostado-800">
                  <span class="font-semibold tabular-nums">{{ item.quantity }}×</span>
                  {{ nombreCompleto(item.name, item.size, item.unit) }}
                  <span class="text-cascara-600">· {{ formatearMoneda(item.price) }} c/u</span>
                </span>

                <!-- El subtotal solo aporta cuando hay más de una línea: con una
                     sola sería el mismo número que el total de la venta. -->
                <span v-if="venta.items.length > 1" class="tabular-nums text-tostado-700">
                  {{ formatearMoneda(item.price * item.quantity) }}
                </span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
