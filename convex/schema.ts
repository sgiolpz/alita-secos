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

  // `size` + `unit` es la presentación del producto: 500 g, o 12 un. para lo
  // que se vende por cantidad. Dos productos pueden compartir nombre si su
  // presentación es distinta.
  //
  // Son opcionales solo por los productos creados antes de que existiera el
  // campo: el formulario siempre los exige.
  products: defineTable({
    name: v.string(),
    size: v.optional(v.number()),
    unit: v.optional(v.union(v.literal('g'), v.literal('un'))),
    price: v.number(),
    stock: v.number(),
  }).index('by_name', ['name']),

  // Cada venta guarda una copia (snapshot) del nombre y precio del producto:
  // si mañana el producto cambia de precio, la venta histórica no se altera.
  sales: defineTable({
    items: v.array(
      v.object({
        productId: v.id('products'),
        name: v.string(),
        // Opcionales: las ventas anteriores a que existiera la presentación
        // no la tienen, y una venta ya registrada no se reescribe.
        size: v.optional(v.number()),
        unit: v.optional(v.union(v.literal('g'), v.literal('un'))),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    total: v.number(),
  }),
})
