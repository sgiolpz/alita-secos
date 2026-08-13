<script setup lang="ts">
import { computed } from 'vue'
import { useConvexQuery } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { token } from '@/lib/sesion'
import TiendasPanel from '@/components/TiendasPanel.vue'
import UsuariosPanel from '@/components/UsuariosPanel.vue'

const { data: tiendas, isPending: cargandoTiendas } = useConvexQuery(api.admin.tiendas, () => ({
  token: token.value,
}))
const { data: usuarios, isPending: cargandoUsuarios } = useConvexQuery(api.admin.usuarios, () => ({
  token: token.value,
}))

const listaTiendas = computed(() => tiendas.value ?? [])
const listaUsuarios = computed(() => usuarios.value ?? [])
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="titulo-pagina">Administración</h1>
      <p class="mt-1.5 text-[14px] text-cascara-600">
        Las tiendas y quién trabaja en cada una. Cada tienda maneja su propio inventario, sus ventas
        y su recaudación, y nadie ve lo de otra.
      </p>
    </header>

    <TiendasPanel :tiendas="listaTiendas" :cargando="cargandoTiendas" />

    <UsuariosPanel
      :usuarios="listaUsuarios"
      :tiendas="listaTiendas"
      :cargando="cargandoUsuarios"
    />
  </div>
</template>
