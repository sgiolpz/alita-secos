import { computed, ref } from 'vue'

const CLAVE = 'alita-secos:sesion'

export type Rol = 'admin' | 'member'

export interface Sesion {
  token: string
  username: string
  displayName: string
  /** `admin` es el administrador global: el único que ve Administración. */
  role: Rol
  storeName: string
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
      // Las sesiones guardadas antes de que existieran las tiendas no traen
      // rol: se asume el más restringido y el servidor lo corrige enseguida.
      role: dato.role === 'admin' ? 'admin' : 'member',
      storeName: dato.storeName ?? '',
    }
  } catch {
    return null
  }
}

const actual = ref<Sesion | null>(leerAlmacenada())

export const sesion = computed(() => actual.value)
export const haySesion = computed(() => actual.value !== null)
export const esAdmin = computed(() => actual.value?.role === 'admin')

/** Token para pasar a las funciones de Convex. Cadena vacía si no hay sesión. */
export const token = computed(() => actual.value?.token ?? '')

export function guardarSesion(nueva: Sesion) {
  actual.value = nueva
  localStorage.setItem(CLAVE, JSON.stringify(nueva))
}

/**
 * Refresca lo que puede haber cambiado en el servidor —el nombre, la tienda,
 * el rol— sin tocar el token. Se llama con lo que devuelve `auth.sesionActual`.
 */
export function sincronizarSesion(datos: Omit<Sesion, 'token'>) {
  if (!actual.value) return
  const igual =
    actual.value.username === datos.username &&
    actual.value.displayName === datos.displayName &&
    actual.value.role === datos.role &&
    actual.value.storeName === datos.storeName
  if (igual) return

  guardarSesion({ ...datos, token: actual.value.token })
}

export function borrarSesion() {
  actual.value = null
  localStorage.removeItem(CLAVE)
}
