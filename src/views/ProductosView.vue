<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { token } from '@/lib/sesion'
import ProductForm from '@/components/ProductForm.vue'
import ProductCatalog from '@/components/ProductCatalog.vue'

const { data: productos, isPending } = useConvexQuery(api.products.list, () => ({
  token: token.value,
}))

const lista = computed(() => productos.value ?? [])
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="titulo-pagina">Productos</h1>
      <p class="mt-1.5 text-[14px] text-cascara-600">
        El catálogo: qué se vende, en qué presentación y a qué precio.
      </p>
    </header>

    <ProductForm />

    <ProductCatalog :productos="lista" :cargando="isPending" />
  </div>
</template>
