<script setup lang="ts">
import { computed } from 'vue'

import { formatearMoneda, formatearNumero, nombreCompleto } from '@/lib/format'
import type { FilaRecaudacion } from '@/lib/tipos'

const props = defineProps<{
  titulo: string
  columna: string
  filas: FilaRecaudacion[]
  vacio: string
}>()

/** La barra se mide contra el primero, no contra el total: así el más alto
    llega al borde y las diferencias entre filas se leen de un vistazo. */
const mayor = computed(() => props.filas.reduce((max, fila) => Math.max(max, fila.total), 0))

function proporcion(total: number): string {
  if (mayor.value <= 0) return '0%'
  return `${Math.max(2, Math.round((total / mayor.value) * 100))}%`
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">{{ titulo }}</h2>
    </div>

    <p v-if="filas.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      {{ vacio }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="tabla tabla-apilable">
        <thead>
          <tr>
            <th>{{ columna }}</th>
            <th class="num">Ventas</th>
            <th class="num">Unidades</th>
            <th class="num">Recaudación</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="fila in filas" :key="fila.clave" class="fila-dato">
            <td :data-col="columna">
              <span class="font-semibold">
                {{ nombreCompleto(fila.nombre, fila.size, fila.unit) }}
              </span>

              <!-- Ayuda a comparar de un vistazo en la tabla ancha. Apilada en
                   el teléfono la celda es un flex y la barra competiría con el
                   nombre, así que ahí no se muestra. -->
              <span
                class="mt-1.5 hidden h-[3px] w-full max-w-[220px] rounded-full bg-kraft-200 sm:block"
              >
                <span
                  class="block h-full rounded-full bg-cascara-400"
                  :style="{ width: proporcion(fila.total) }"
                />
              </span>
            </td>

            <td data-col="Ventas" class="num text-cascara-600">
              {{ formatearNumero(fila.ventas) }}
            </td>
            <td data-col="Unidades" class="num text-cascara-600">
              {{ formatearNumero(fila.unidades) }}
            </td>
            <td data-col="Recaudación" class="num font-semibold">
              {{ formatearMoneda(fila.total) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
