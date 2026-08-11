<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { mensajeDeError } from '@/lib/errores'
import AvisoMensaje from './AvisoMensaje.vue'

const nombre = ref('')
const precio = ref<number | null>(null)
const stock = ref<number | null>(null)

const error = ref('')
const exito = ref('')

const { mutate: agregarProducto, isPending } = useConvexMutation(api.products.add)

async function enviar() {
  error.value = ''
  exito.value = ''

  const nombreLimpio = nombre.value.trim()
  if (!nombreLimpio) {
    error.value = 'Escribe el nombre del producto.'
    return
  }
  if (precio.value === null || precio.value < 0) {
    error.value = 'Indica un precio válido.'
    return
  }
  if (stock.value === null || !Number.isInteger(stock.value) || stock.value < 0) {
    error.value = 'El stock inicial debe ser un número entero mayor o igual a 0.'
    return
  }

  try {
    await agregarProducto({
      name: nombreLimpio,
      price: precio.value,
      stock: stock.value,
    })
    exito.value = `"${nombreLimpio}" se agregó al inventario.`
    nombre.value = ''
    precio.value = null
    stock.value = null
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="tarjeta p-5">
    <h2 class="mb-4 text-lg font-bold text-cascara-800">Agregar producto</h2>

    <form class="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" @submit.prevent="enviar">
      <div>
        <label class="etiqueta" for="nombre">Nombre</label>
        <input
          id="nombre"
          v-model="nombre"
          class="campo"
          type="text"
          placeholder="Maní con cáscara 500 g"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="etiqueta" for="precio">Precio</label>
        <input
          id="precio"
          v-model.number="precio"
          class="campo"
          type="number"
          min="0"
          step="1"
          placeholder="2990"
        />
      </div>

      <div>
        <label class="etiqueta" for="stock">Stock inicial</label>
        <input
          id="stock"
          v-model.number="stock"
          class="campo"
          type="number"
          min="0"
          step="1"
          placeholder="20"
        />
      </div>

      <button class="btn-primario h-[42px]" type="submit" :disabled="isPending">
        {{ isPending ? 'Guardando…' : 'Agregar' }}
      </button>
    </form>

    <div v-if="error || exito" class="mt-4">
      <AvisoMensaje v-if="error" tipo="error" :texto="error" />
      <AvisoMensaje v-else tipo="exito" :texto="exito" />
    </div>
  </section>
</template>
