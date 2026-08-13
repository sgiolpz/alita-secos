import { ConvexError } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { requiereUsuario } from './auth'

const SIN_TIENDA = 'Tu cuenta no está asociada a ninguna tienda. Pídele al administrador que te asigne una.'
const TIENDA_INACTIVA = 'Tu tienda está desactivada. Habla con el administrador.'
const SOLO_ADMIN = 'Solo el administrador puede hacer esto.'

/** Lo que necesita saber cualquier función del negocio: quién consulta y de qué tienda. */
export interface Contexto {
  usuario: Doc<'users'>
  tienda: Doc<'stores'>
  storeId: Id<'stores'>
}

export function esAdmin(usuario: Doc<'users'>): boolean {
  return usuario.role === 'admin'
}

/**
 * Puerta de entrada de todo lo que toca datos del negocio.
 *
 * Devuelve la tienda de quien consulta, y es el único lugar del que puede
 * salir un `storeId`: nunca se acepta uno que venga del navegador. Así una
 * sesión no puede pedir datos de otra tienda ni por error ni a propósito.
 */
export async function requiereTienda(ctx: QueryCtx | MutationCtx, token: string): Promise<Contexto> {
  const usuario = await requiereUsuario(ctx, token)

  if (!usuario.storeId) {
    throw new ConvexError(SIN_TIENDA)
  }
  const tienda = await ctx.db.get(usuario.storeId)
  if (!tienda) {
    throw new ConvexError(SIN_TIENDA)
  }
  if (!tienda.active) {
    throw new ConvexError(TIENDA_INACTIVA)
  }

  return { usuario, tienda, storeId: tienda._id }
}

/** Igual que `requiereTienda`, pero además exige ser el administrador global. */
export async function requiereAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<'users'>> {
  const usuario = await requiereUsuario(ctx, token)
  if (!esAdmin(usuario)) {
    throw new ConvexError(SOLO_ADMIN)
  }
  return usuario
}

/**
 * Busca un producto exigiendo que sea de esta tienda.
 *
 * Si es de otra, el mensaje es el mismo que si no existiera: desde afuera no
 * se puede distinguir un id ajeno de un id inventado.
 */
export async function productoDeTienda(
  ctx: QueryCtx | MutationCtx,
  id: Id<'products'>,
  storeId: Id<'stores'>,
): Promise<Doc<'products'>> {
  const producto = await ctx.db.get(id)
  if (!producto || producto.storeId !== storeId) {
    throw new ConvexError('El producto ya no existe.')
  }
  return producto
}

/** Busca una persona exigiendo que sea de esta tienda. Misma lógica de discreción. */
export async function personaDeTienda(
  ctx: QueryCtx | MutationCtx,
  id: Id<'users'>,
  storeId: Id<'stores'>,
): Promise<Doc<'users'>> {
  const persona = await ctx.db.get(id)
  if (!persona || persona.storeId !== storeId) {
    throw new ConvexError('Esa persona ya no existe.')
  }
  return persona
}

export { SIN_TIENDA, SOLO_ADMIN, TIENDA_INACTIVA }
