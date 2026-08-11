import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
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
