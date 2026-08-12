<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { formatearDia, formatearHora, formatearNumero, nombreCompleto } from '@/lib/format'
import { token } from '@/lib/sesion'

const { data: correcciones, isPending } = useConvexQuery(api.products.corrections, () => ({
  token: token.value,
}))

const lista = computed(() => correcciones.value ?? [])
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Correcciones de stock</h2>
    </div>

    <p v-if="isPending" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Cargando correcciones…
    </p>

    <p v-else-if="lista.length === 0" class="px-5 py-10 text-center text-[14px] text-cascara-600">
      Aquí quedará constancia cuando se corrija un ingreso equivocado.
    </p>

    <ul v-else class="divide-y divide-kraft-200">
      <li v-for="correccion in lista" :key="correccion._id" class="px-5 py-3.5">
        <div class="flex items-baseline justify-between gap-4">
          <p class="rotulo">
            {{ formatearDia(correccion._creationTime) }}, {{ formatearHora(correccion._creationTime) }}
            <span class="text-cascara-500">· {{ correccion.performedByName }}</span>
          </p>
          <p class="font-semibold tabular-nums text-piel-600">
            -{{ formatearNumero(correccion.quantity) }}
          </p>
        </div>

        <p class="mt-1 text-[14px] text-tostado-800">
          {{ nombreCompleto(correccion.productName, correccion.size, correccion.unit) }}
          <span class="text-cascara-600">· stock de {{ correccion.ownerName }}</span>
        </p>

        <p class="mt-0.5 text-[13px] text-cascara-600">Corrección por ingreso incorrecto</p>
      </li>
    </ul>
  </section>
</template>
