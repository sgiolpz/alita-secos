import { ConvexError } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/** Iteraciones de PBKDF2. Alto a propósito: encarece los ataques por fuerza bruta. */
const ITERACIONES = 100_000
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000 // 30 días

const SESION_INVALIDA = 'Tu sesión expiró. Vuelve a iniciar sesión.'

function aHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function desdeHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesAleatorios(cantidad: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(cantidad))
}

/** Deriva la contraseña con PBKDF2-SHA256 sobre la sal indicada. */
export async function derivarHash(password: string, salHex: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: desdeHex(salHex) as unknown as ArrayBuffer,
      iterations: ITERACIONES,
      hash: 'SHA-256',
    },
    clave,
    256,
  )
  return aHex(new Uint8Array(bits))
}

/** Genera una sal nueva y devuelve el hash de la contraseña. */
export async function hashearPassword(password: string) {
  const salt = aHex(bytesAleatorios(16))
  return { salt, hash: await derivarHash(password, salt) }
}

/** Comparación en tiempo constante: no revela en qué carácter falló. */
function sonIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferencia === 0
}

export async function passwordCoincide(usuario: Doc<'users'>, password: string): Promise<boolean> {
  return sonIguales(await derivarHash(password, usuario.passwordSalt), usuario.passwordHash)
}

/** Los nombres de usuario se comparan siempre en minúsculas y sin espacios. */
export function normalizarUsuario(username: string): string {
  return username.trim().toLowerCase()
}

export function nuevoToken(): string {
  return aHex(bytesAleatorios(32))
}

export function vencimientoSesion(): number {
  return Date.now() + DURACION_SESION_MS
}

/** Devuelve el usuario de la sesión, o `null` si el token no sirve. */
export async function usuarioDeSesion(
  ctx: QueryCtx,
  token: string,
): Promise<Doc<'users'> | null> {
  if (!token) return null

  const sesion = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first()
  if (!sesion || sesion.expiresAt < Date.now()) return null

  return await ctx.db.get(sesion.userId)
}

/**
 * Igual que `usuarioDeSesion`, pero falla si no hay sesión válida.
 * Toda query o mutation con datos del negocio debe empezar llamando a esto.
 */
export async function requiereUsuario(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<'users'>> {
  const usuario = await usuarioDeSesion(ctx, token)
  if (!usuario) {
    throw new ConvexError(SESION_INVALIDA)
  }
  return usuario
}

export { SESION_INVALIDA }
