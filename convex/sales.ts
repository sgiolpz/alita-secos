import { ConvexError, v } from 'convex/values'

import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requiereUsuario } from './model/auth'
import { ajustarStock, stockDe } from './model/stock'

/** Últimas ventas registradas, de la más reciente a la más antigua. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    return await ctx.db.query('sales').order('desc').take(50)
  },
})

/**
 * Registra una venta y descuenta el stock de quien la está haciendo.
 *
 * Cada quien vende de lo suyo: el descuento sale siempre del stock de la
 * sesión, nunca del de otra persona. Las mutations de Convex son
 * transaccionales, así que si una sola línea falla no se aplica nada.
 */
export const create = mutation({
  args: {
    token: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const vendedor = await requiereUsuario(ctx, args.token)

    if (args.items.length === 0) {
      throw new ConvexError('La venta no tiene productos.')
    }

    // Consolida líneas repetidas del mismo producto antes de validar el stock.
    const quantities = new Map<Id<'products'>, number>()
    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ConvexError('La cantidad debe ser un número entero mayor a 0.')
      }
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    }

    const lines = []
    let total = 0

    for (const [productId, quantity] of quantities) {
      const product = await ctx.db.get(productId)
      if (!product) {
        throw new ConvexError('Uno de los productos de la venta ya no existe.')
      }

      const propio = await stockDe(ctx, productId, vendedor._id)
      if (propio < quantity) {
        throw new ConvexError(
          `${vendedor.displayName} tiene ${propio} unidades de "${product.name}" y se intentan vender ${quantity}.`,
        )
      }

      lines.push({
        productId,
        name: product.name,
        size: product.size,
        unit: product.unit,
        price: product.price,
        quantity,
      })
      total += product.price * quantity
    }

    for (const line of lines) {
      await ajustarStock(ctx, line.productId, vendedor._id, -line.quantity)
    }

    return await ctx.db.insert('sales', {
      userId: vendedor._id,
      sellerName: vendedor.displayName,
      items: lines,
      total,
    })
  },
})
