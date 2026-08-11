import { ConvexError, v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { requiereUsuario } from './model/auth'
import { ajustarStock, stockDe, validarCantidad } from './model/stock'

const unidadValidador = v.union(v.literal('g'), v.literal('un'))

function medidaLegible(size: number, unit: 'g' | 'un'): string {
  return unit === 'g' ? `${size} g` : `${size} un.`
}

/**
 * El catálogo completo con su stock repartido por persona.
 *
 * `propio` es lo que tiene quien hace la consulta: es el único stock que esa
 * persona puede vender. `stocks` trae el reparto completo, porque la
 * información es global y en Inventario se ve quién tiene qué.
 *
 * Lee las dos tablas de una vez y las cruza en memoria: son pocas filas y así
 * se evita una consulta de stock por cada producto.
 */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const usuario = await requiereUsuario(ctx, args.token)

    const [productos, stocks] = await Promise.all([
      ctx.db.query('products').collect(),
      ctx.db.query('stocks').collect(),
    ])

    const porProducto = new Map<string, { userId: string; quantity: number }[]>()
    for (const fila of stocks) {
      const lista = porProducto.get(fila.productId) ?? []
      lista.push({ userId: fila.userId, quantity: fila.quantity })
      porProducto.set(fila.productId, lista)
    }

    return productos
      .map((producto) => {
        const propios = porProducto.get(producto._id) ?? []
        return {
          _id: producto._id,
          _creationTime: producto._creationTime,
          name: producto.name,
          size: producto.size,
          unit: producto.unit,
          price: producto.price,
          stocks: propios,
          total: propios.reduce((suma, fila) => suma + fila.quantity, 0),
          propio: propios.find((fila) => fila.userId === usuario._id)?.quantity ?? 0,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
})

/**
 * Crea un producto en el catálogo. Nace sin stock: la mercadería se recibe
 * después, a nombre de quien la va a vender.
 */
export const add = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    size: v.number(),
    unit: unidadValidador,
    price: v.number(),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const name = args.name.trim()
    if (name.length === 0) {
      throw new ConvexError('El nombre del producto es obligatorio.')
    }
    if (!Number.isFinite(args.size) || args.size <= 0) {
      throw new ConvexError('El peso debe ser un número mayor a 0.')
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw new ConvexError('El precio no puede ser negativo.')
    }

    // Se permite repetir el nombre con otra presentación (250 g y 500 g),
    // pero no la misma presentación dos veces.
    const mismoNombre = await ctx.db
      .query('products')
      .withIndex('by_name', (q) => q.eq('name', name))
      .collect()
    if (mismoNombre.some((p) => p.size === args.size && p.unit === args.unit)) {
      throw new ConvexError(`Ya existe "${name}" de ${medidaLegible(args.size, args.unit)}.`)
    }

    return await ctx.db.insert('products', {
      name,
      size: args.size,
      unit: args.unit,
      price: args.price,
    })
  },
})

/** Edita los datos del catálogo. El stock se maneja aparte. */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id('products'),
    name: v.string(),
    size: v.number(),
    unit: unidadValidador,
    price: v.number(),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }

    const name = args.name.trim()
    if (name.length === 0) {
      throw new ConvexError('El nombre del producto es obligatorio.')
    }
    if (!Number.isFinite(args.size) || args.size <= 0) {
      throw new ConvexError('El peso debe ser un número mayor a 0.')
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw new ConvexError('El precio no puede ser negativo.')
    }

    const mismoNombre = await ctx.db
      .query('products')
      .withIndex('by_name', (q) => q.eq('name', name))
      .collect()
    const duplicado = mismoNombre.some(
      (p) => p._id !== args.id && p.size === args.size && p.unit === args.unit,
    )
    if (duplicado) {
      throw new ConvexError(`Ya existe "${name}" de ${medidaLegible(args.size, args.unit)}.`)
    }

    await ctx.db.patch(args.id, {
      name,
      size: args.size,
      unit: args.unit,
      price: args.price,
    })
  },
})

/** Entrega mercadería a una persona: ese stock es el que después podrá vender. */
export const receiveStock = mutation({
  args: {
    token: v.string(),
    id: v.id('products'),
    userId: v.id('users'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }
    const destinatario = await ctx.db.get(args.userId)
    if (!destinatario) {
      throw new ConvexError('Esa persona ya no existe.')
    }
    validarCantidad(args.quantity, 'recibir')

    await ajustarStock(ctx, args.id, args.userId, args.quantity)
  },
})

/** Pasa unidades del stock de una persona al de otra. */
export const transferStock = mutation({
  args: {
    token: v.string(),
    id: v.id('products'),
    fromUserId: v.id('users'),
    toUserId: v.id('users'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    if (args.fromUserId === args.toUserId) {
      throw new ConvexError('Elige dos personas distintas para el traspaso.')
    }

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }
    const origen = await ctx.db.get(args.fromUserId)
    const destino = await ctx.db.get(args.toUserId)
    if (!origen || !destino) {
      throw new ConvexError('Esa persona ya no existe.')
    }
    validarCantidad(args.quantity, 'traspasar')

    const disponible = await stockDe(ctx, args.id, args.fromUserId)
    if (disponible < args.quantity) {
      throw new ConvexError(
        `${origen.displayName} tiene ${disponible} unidades de "${product.name}", no alcanzan para traspasar ${args.quantity}.`,
      )
    }

    await ajustarStock(ctx, args.id, args.fromUserId, -args.quantity)
    await ajustarStock(ctx, args.id, args.toUserId, args.quantity)
  },
})

/** Elimina un producto y todo su stock. Las ventas ya registradas no cambian. */
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id('products'),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }

    const filas = await ctx.db
      .query('stocks')
      .withIndex('by_product', (q) => q.eq('productId', args.id))
      .collect()
    for (const fila of filas) {
      await ctx.db.delete(fila._id)
    }

    await ctx.db.delete(args.id)
  },
})
