<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import SaleCart from '@/components/SaleCart.vue'
import SalesHistory from '@/components/SalesHistory.vue'

const { data: productos, isPending } = useConvexQuery(api.products.list)

const lista = computed(() => productos.value ?? [])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-cascara-900">Ventas</h2>
      <p class="text-cascara-600">
        Arma el carrito y registra la venta: el stock se descuenta automáticamente.
      </p>
    </div>

    <SaleCart :productos="lista" :cargando="isPending" />

    <SalesHistory />
  </div>
</template>
