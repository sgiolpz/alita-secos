<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { token } from '@/lib/sesion'
import SaleCart from '@/components/SaleCart.vue'
import SalesHistory from '@/components/SalesHistory.vue'

const { data: productos, isPending } = useConvexQuery(api.products.list, () => ({
  token: token.value,
}))

const lista = computed(() => productos.value ?? [])
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="titulo-pagina">Ventas</h1>
      <p class="mt-1.5 text-[14px] text-cascara-600">
        Arma el carrito y registra la venta. Se descuenta de tu stock y la venta queda a tu nombre.
      </p>
    </header>

    <SaleCart :productos="lista" :cargando="isPending" />

    <SalesHistory />
  </div>
</template>
