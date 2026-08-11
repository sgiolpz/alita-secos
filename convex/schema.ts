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

  products: defineTable({
    name: v.string(),
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
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    total: v.number(),
  }),
})
