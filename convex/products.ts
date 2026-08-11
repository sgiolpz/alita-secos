import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requiereUsuario } from './model/auth'

/** Lista todos los productos ordenados alfabéticamente. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const products = await ctx.db.query('products').collect()
    return products.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
})

const unidadValidador = v.union(v.literal('g'), v.literal('un'))

function medidaLegible(size: number, unit: 'g' | 'un'): string {
  return unit === 'g' ? `${size} g` : `${size} un.`
}

/**
 * Crea un producto en el catálogo. Nace con stock 0: las unidades se cargan
 * después desde Inventario, cuando llega la mercadería.
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
      stock: 0,
    })
  },
})

/** Edita los datos del catálogo. El stock se maneja con addStock / ventas. */
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

/** Suma unidades al stock (reposición de inventario). */
export const addStock = mutation({
  args: {
    token: v.string(),
    id: v.id('products'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }
    if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
      throw new ConvexError('La cantidad a agregar debe ser un número entero mayor a 0.')
    }

    await ctx.db.patch(args.id, { stock: product.stock + args.quantity })
  },
})

/** Elimina un producto del inventario. Las ventas ya registradas no se modifican. */
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
    await ctx.db.delete(args.id)
  },
})
