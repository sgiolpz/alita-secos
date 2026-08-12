<script setup lang="ts">
import { ref } from 'vue'
import { useConvexMutation } from 'convex-vue'

import { api } from '../../convex/_generated/api'
import { UNIDADES, type UnidadProducto } from '@/lib/format'
import { mensajeDeError } from '@/lib/errores'
import { token } from '@/lib/sesion'
import AvisoMensaje from './AvisoMensaje.vue'

const nombre = ref('')
const peso = ref<number | null>(null)
const unidad = ref<UnidadProducto>('g')
const precio = ref<number | null>(null)

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
  if (peso.value === null || peso.value <= 0) {
    error.value = 'Indica la cantidad del producto.'
    return
  }
  if (precio.value === null || precio.value < 0) {
    error.value = 'Indica un precio válido.'
    return
  }

  try {
    await agregarProducto({
      token: token.value,
      name: nombreLimpio,
      size: peso.value,
      unit: unidad.value,
      price: precio.value,
    })
    exito.value = `${nombreLimpio} creado. Cárgale stock desde Inventario.`
    nombre.value = ''
    peso.value = null
    precio.value = null
  } catch (e) {
    error.value = mensajeDeError(e)
  }
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="panel-cabecera">
      <h2 class="titulo-seccion">Crear producto</h2>
      <span class="rotulo">Nace con stock 0</span>
    </div>

    <form
      class="grid gap-4 px-5 py-5 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
      @submit.prevent="enviar"
    >
      <div>
        <label class="etiqueta" for="nombre">Nombre</label>
        <input
          id="nombre"
          v-model="nombre"
          class="campo"
          type="text"
          placeholder="Maní con cáscara"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="etiqueta" for="peso">Cantidad</label>
        <input
          id="peso"
          v-model.number="peso"
          class="campo"
          type="number"
          min="1"
          step="1"
          placeholder="100"
        />
      </div>

      <div>
        <label class="etiqueta" for="unidad">Unidad</label>
        <select id="unidad" v-model="unidad" class="campo">
          <option v-for="opcion in UNIDADES" :key="opcion.valor" :value="opcion.valor">
            {{ opcion.etiqueta }}
          </option>
        </select>
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
          placeholder="1000"
        />
      </div>

      <button class="btn-primario h-[42px]" type="submit" :disabled="isPending">
        {{ isPending ? 'Creando…' : 'Crear producto' }}
      </button>
    </form>

    <div v-if="error || exito" class="px-5 pb-5">
      <AvisoMensaje v-if="error" tipo="error" :texto="error" />
      <AvisoMensaje v-else tipo="exito" :texto="exito" />
    </div>
  </section>
</template>
