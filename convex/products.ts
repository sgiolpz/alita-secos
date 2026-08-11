import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'

/** Lista todos los productos ordenados alfabéticamente. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect()
    return products.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
})

/** Agrega un producto nuevo al inventario. */
export const add = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    stock: v.number(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim()
    if (name.length === 0) {
      throw new ConvexError('El nombre del producto es obligatorio.')
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw new ConvexError('El precio no puede ser negativo.')
    }
    if (!Number.isInteger(args.stock) || args.stock < 0) {
      throw new ConvexError('El stock inicial debe ser un número entero mayor o igual a 0.')
    }

    const existing = await ctx.db
      .query('products')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first()
    if (existing) {
      throw new ConvexError(`Ya existe un producto llamado "${name}".`)
    }

    return await ctx.db.insert('products', { name, price: args.price, stock: args.stock })
  },
})

/** Edita el nombre y el precio de un producto. El stock se maneja con addStock / ventas. */
export const update = mutation({
  args: {
    id: v.id('products'),
    name: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }

    const name = args.name.trim()
    if (name.length === 0) {
      throw new ConvexError('El nombre del producto es obligatorio.')
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw new ConvexError('El precio no puede ser negativo.')
    }

    const duplicate = await ctx.db
      .query('products')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first()
    if (duplicate && duplicate._id !== args.id) {
      throw new ConvexError(`Ya existe otro producto llamado "${name}".`)
    }

    await ctx.db.patch(args.id, { name, price: args.price })
  },
})

/** Suma unidades al stock (reposición de inventario). */
export const addStock = mutation({
  args: {
    id: v.id('products'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
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
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new ConvexError('El producto ya no existe.')
    }
    await ctx.db.delete(args.id)
  },
})
