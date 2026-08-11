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
    <div>
      <h2 class="text-2xl font-bold text-cascara-900">Productos</h2>
      <p class="text-cascara-600">
        El catálogo: qué se vende, en qué presentación y a qué precio.
      </p>
    </div>

    <ProductForm />

    <ProductCatalog :productos="lista" :cargando="isPending" />
  </div>
</template>
