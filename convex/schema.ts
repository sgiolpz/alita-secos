import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Los usuarios se crean solo desde la terminal (internal.auth.guardarUsuario):
  // la app no tiene registro abierto.
  users: defineTable({
    username: v.string(),
    displayName: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
  }).index('by_username', ['username']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

  // El catálogo es compartido: qué se vende, en qué presentación y a qué precio.
  // `size` + `unit` es la presentación: 500 g, o 12 un. para lo que se vende por
  // cantidad. Dos productos pueden compartir nombre si su presentación difiere.
  //
  // La presentación es opcional solo por los productos creados antes de que
  // existiera el campo; el formulario siempre la exige.
  products: defineTable({
    name: v.string(),
    size: v.optional(v.number()),
    unit: v.optional(v.union(v.literal('g'), v.literal('un'))),
    price: v.number(),
    // Campo histórico: el stock ahora vive en la tabla `stocks`, repartido por
    // persona. Se conserva como opcional hasta terminar de migrarlo.
    stock: v.optional(v.number()),
  }).index('by_name', ['name']),

  // La mercadería sí tiene dueño: cada quien vende de lo suyo.
  // Que no exista fila equivale a tener 0.
  stocks: defineTable({
    productId: v.id('products'),
    userId: v.id('users'),
    quantity: v.number(),
  })
    .index('by_product', ['productId'])
    .index('by_product_user', ['productId', 'userId'])
    .index('by_user', ['userId']),

  sales: defineTable({
    // Quién vendió. Opcionales por las ventas anteriores al reparto de stock.
    userId: v.optional(v.id('users')),
    sellerName: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id('products'),
        name: v.string(),
        size: v.optional(v.number()),
        unit: v.optional(v.union(v.literal('g'), v.literal('un'))),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    total: v.number(),
  }).index('by_user', ['userId']),
})
