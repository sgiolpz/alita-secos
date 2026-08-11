import { computed, ref } from 'vue'

const CLAVE = 'alita-secos:sesion'

export interface Sesion {
  token: string
  username: string
  displayName: string
}

function leerAlmacenada(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const dato = JSON.parse(crudo) as Partial<Sesion>
    if (typeof dato.token !== 'string' || !dato.token) return null
    return {
      token: dato.token,
      username: dato.username ?? '',
      displayName: dato.displayName ?? '',
    }
  } catch {
    return null
  }
}

const actual = ref<Sesion | null>(leerAlmacenada())

export const sesion = computed(() => actual.value)
export const haySesion = computed(() => actual.value !== null)

/** Token para pasar a las funciones de Convex. Cadena vacía si no hay sesión. */
export const token = computed(() => actual.value?.token ?? '')

export function guardarSesion(nueva: Sesion) {
  actual.value = nueva
  localStorage.setItem(CLAVE, JSON.stringify(nueva))
}

export function borrarSesion() {
  actual.value = null
  localStorage.removeItem(CLAVE)
}
