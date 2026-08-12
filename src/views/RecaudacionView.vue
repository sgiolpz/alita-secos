<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { formatearMoneda, formatearNumero, nombreCompleto } from '@/lib/format'
import { token } from '@/lib/sesion'
import RankingRecaudacion from '@/components/RankingRecaudacion.vue'

const usuarioFiltro = ref<string>('')
const productoFiltro = ref<string>('')

const { data: usuarios } = useConvexQuery(api.users.list, () => ({ token: token.value }))
const { data: productos } = useConvexQuery(api.products.list, () => ({ token: token.value }))

const { data: recaudacion, isPending } = useConvexQuery(api.sales.recaudacion, () => ({
  token: token.value,
  // Convex distingue "sin filtro" de "filtro vacío": se omite la clave.
  ...(usuarioFiltro.value ? { userId: usuarioFiltro.value as Id<'users'> } : {}),
  ...(productoFiltro.value ? { productId: productoFiltro.value as Id<'products'> } : {}),
}))

const gente = computed(() => usuarios.value ?? [])
const catalogo = computed(() => productos.value ?? [])

const hayFiltros = computed(() => usuarioFiltro.value !== '' || productoFiltro.value !== '')

function limpiar() {
  usuarioFiltro.value = ''
  productoFiltro.value = ''
}

const resumen = computed(() => [
  { titulo: 'Recaudación', valor: formatearMoneda(recaudacion.value?.total ?? 0), fuerte: true },
  { titulo: 'Ventas', valor: formatearNumero(recaudacion.value?.ventas ?? 0) },
  { titulo: 'Unidades', valor: formatearNumero(recaudacion.value?.unidades ?? 0) },
])

const sinVentas = computed(
  () => !isPending.value && (recaudacion.value?.ventas ?? 0) === 0,
)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="titulo-pagina">Recaudación</h1>
      <p class="mt-1.5 text-[14px] text-cascara-600">
        Cuánto dinero entró, quién lo vendió y qué se vendió más.
      </p>
    </header>

    <section class="panel px-5 py-4">
      <div class="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label class="etiqueta" for="filtro-persona">Persona</label>
          <select id="filtro-persona" v-model="usuarioFiltro" class="campo">
            <option value="">Todas las personas</option>
            <option v-for="persona in gente" :key="persona._id" :value="persona._id">
              {{ persona.displayName }}
            </option>
          </select>
        </div>

        <div>
          <label class="etiqueta" for="filtro-producto">Producto</label>
          <select id="filtro-producto" v-model="productoFiltro" class="campo">
            <option value="">Todos los productos</option>
            <option v-for="producto in catalogo" :key="producto._id" :value="producto._id">
              {{ nombreCompleto(producto.name, producto.size, producto.unit) }} -
              {{ formatearMoneda(producto.price) }}
            </option>
          </select>
        </div>

        <button
          class="btn-suave h-[42px]"
          type="button"
          :disabled="!hayFiltros"
          @click="limpiar"
        >
          Limpiar filtros
        </button>
      </div>
    </section>

    <div class="panel flex flex-wrap gap-x-10 gap-y-5 px-5 py-4">
      <div v-for="dato in resumen" :key="dato.titulo">
        <p class="rotulo">{{ dato.titulo }}</p>
        <p class="cifra mt-1" :class="dato.fuerte ? 'text-piel-600' : 'text-tostado-900'">
          {{ dato.valor }}
        </p>
      </div>
    </div>

    <p v-if="isPending" class="panel px-5 py-10 text-center text-[14px] text-cascara-600">
      Calculando recaudación…
    </p>

    <p
      v-else-if="sinVentas"
      class="panel px-5 py-10 text-center text-[14px] text-cascara-600"
    >
      {{
        hayFiltros
          ? 'No hay ventas que coincidan con esos filtros.'
          : 'Todavía no hay ventas registradas.'
      }}
    </p>

    <template v-else>
      <RankingRecaudacion
        titulo="Por persona"
        columna="Persona"
        :filas="recaudacion?.porUsuario ?? []"
        vacio="Nadie ha vendido con esos filtros."
      />

      <RankingRecaudacion
        titulo="Por producto"
        columna="Producto"
        :filas="recaudacion?.porProducto ?? []"
        con-medida
        vacio="No se ha vendido ningún producto con esos filtros."
      />
    </template>
  </div>
</template>
