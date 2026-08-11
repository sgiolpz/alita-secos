import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'

/** Últimas ventas registradas, de la más reciente a la más antigua. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('sales').order('desc').take(50)
  },
})

/**
 * Registra una venta y descuenta el stock de cada producto.
 *
 * Las mutations de Convex son transaccionales: si una sola línea falla
 * (producto inexistente o stock insuficiente) no se aplica ningún cambio.
 */
export const create = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
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
      if (product.stock < quantity) {
        throw new ConvexError(
          `Stock insuficiente de "${product.name}": quedan ${product.stock} unidades y se intentan vender ${quantity}.`,
        )
      }

      lines.push({ productId, name: product.name, price: product.price, quantity })
      total += product.price * quantity
    }

    for (const line of lines) {
      const product = await ctx.db.get(line.productId)
      if (!product) {
        throw new ConvexError('Uno de los productos de la venta ya no existe.')
      }
      await ctx.db.patch(line.productId, { stock: product.stock - line.quantity })
    }

    return await ctx.db.insert('sales', { items: lines, total })
  },
})
