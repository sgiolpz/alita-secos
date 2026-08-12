<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { formatearMoneda, formatearNumero } from '@/lib/format'
import { token } from '@/lib/sesion'
import StockTable from '@/components/StockTable.vue'
import StockCorrectionsHistory from '@/components/StockCorrectionsHistory.vue'

const { data: productos, isPending } = useConvexQuery(api.products.list, () => ({
  token: token.value,
}))
const { data: usuarios } = useConvexQuery(api.users.list, () => ({ token: token.value }))

const lista = computed(() => productos.value ?? [])
const gente = computed(() => usuarios.value ?? [])

const unidadesTotales = computed(() => lista.value.reduce((suma, p) => suma + p.total, 0))
const valorInventario = computed(() =>
  lista.value.reduce((suma, p) => suma + p.price * p.total, 0),
)
const agotados = computed(() => lista.value.filter((p) => p.total === 0).length)

const resumen = computed(() => [
  { titulo: 'Productos', valor: formatearNumero(lista.value.length) },
  { titulo: 'Unidades', valor: formatearNumero(unidadesTotales.value) },
  { titulo: 'Valor', valor: formatearMoneda(valorInventario.value) },
  { titulo: 'Agotados', valor: formatearNumero(agotados.value), alerta: agotados.value > 0 },
])
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="titulo-pagina">Inventario</h1>
      <p class="mt-1.5 text-[14px] text-cascara-600">
        Qué tiene cada quien. La mercadería se recibe a nombre de una persona, y esa persona es la
        que después la vende.
      </p>
    </header>

    <div class="panel flex flex-wrap gap-x-10 gap-y-5 px-5 py-4">
      <div v-for="dato in resumen" :key="dato.titulo">
        <p class="rotulo">{{ dato.titulo }}</p>
        <p class="cifra mt-1" :class="dato.alerta ? 'text-piel-600' : 'text-tostado-900'">
          {{ dato.valor }}
        </p>
      </div>
    </div>

    <StockTable :productos="lista" :usuarios="gente" :cargando="isPending" />

    <StockCorrectionsHistory />
  </div>
</template>
