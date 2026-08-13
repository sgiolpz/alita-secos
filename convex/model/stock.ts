import { ConvexError } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/** Fila de stock de una persona para un producto, o `null` si nunca recibió. */
export async function filaDeStock(
  ctx: QueryCtx | MutationCtx,
  productId: Id<'products'>,
  userId: Id<'users'>,
): Promise<Doc<'stocks'> | null> {
  return await ctx.db
    .query('stocks')
    .withIndex('by_product_user', (q) => q.eq('productId', productId).eq('userId', userId))
    .first()
}

/** Unidades que tiene esa persona de ese producto. Sin fila, 0. */
export async function stockDe(
  ctx: QueryCtx | MutationCtx,
  productId: Id<'products'>,
  userId: Id<'users'>,
): Promise<number> {
  return (await filaDeStock(ctx, productId, userId))?.quantity ?? 0
}

/**
 * Suma (o resta, con delta negativo) unidades al stock de una persona.
 * Crea la fila si no existía y la borra si queda en cero, para no dejar
 * filas vacías dando vueltas.
 */
export async function ajustarStock(
  ctx: MutationCtx,
  storeId: Id<'stores'>,
  productId: Id<'products'>,
  userId: Id<'users'>,
  delta: number,
): Promise<number> {
  const fila = await filaDeStock(ctx, productId, userId)
  const actual = fila?.quantity ?? 0
  const nuevo = actual + delta

  if (nuevo < 0) {
    throw new ConvexError('El stock no puede quedar negativo.')
  }

  if (!fila) {
    if (nuevo > 0) {
      await ctx.db.insert('stocks', { storeId, productId, userId, quantity: nuevo })
    }
  } else if (nuevo === 0) {
    await ctx.db.delete(fila._id)
  } else {
    await ctx.db.patch(fila._id, { quantity: nuevo })
  }

  return nuevo
}

export function validarCantidad(cantidad: number, quePasa: string): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new ConvexError(`La cantidad a ${quePasa} debe ser un número entero mayor a 0.`)
  }
}
