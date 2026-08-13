import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Cada tienda es una unidad autónoma: su catálogo, su stock, sus ventas y su
 * gente. Todo lo del negocio cuelga de `storeId` y ninguna función devuelve
 * filas de otra tienda.
 *
 * `storeId` es opcional en el esquema solo porque las filas creadas antes de
 * que existieran las tiendas no lo tenían; `migrations:inicializarMultiTienda`
 * las asigna a "Alita". En código nuevo siempre se escribe.
 */
export default defineSchema({
  stores: defineTable({
    name: v.string(),
    // Desactivar una tienda le corta el acceso a su gente sin borrar su historial.
    active: v.boolean(),
  }).index('by_name', ['name']),

  // Los usuarios los crea el administrador global desde Administración
  // (o la terminal, con internal.auth.guardarUsuario): la app no tiene
  // registro abierto.
  //
  // `role` distingue al administrador global, el único que puede crear tiendas
  // y usuarios. Sin `role`, la cuenta es de uso normal.
  users: defineTable({
    username: v.string(),
    displayName: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    storeId: v.optional(v.id('stores')),
    role: v.optional(v.union(v.literal('admin'), v.literal('member'))),
  })
    .index('by_username', ['username'])
    .index('by_store', ['storeId']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

  // El catálogo es de la tienda: qué vende, en qué presentación y a qué precio.
  // `size` + `unit` es la presentación: 500 g, o 12 un. para lo que se vende por
  // cantidad. Dos productos pueden compartir nombre si su presentación difiere.
  //
  // La presentación es opcional solo por los productos creados antes de que
  // existiera el campo; el formulario siempre la exige.
  products: defineTable({
    storeId: v.optional(v.id('stores')),
    name: v.string(),
    size: v.optional(v.number()),
    unit: v.optional(v.union(v.literal('g'), v.literal('un'))),
    price: v.number(),
  })
    .index('by_store', ['storeId'])
    .index('by_store_name', ['storeId', 'name']),

  // La mercadería sí tiene dueño: cada quien vende de lo suyo.
  // Que no exista fila equivale a tener 0.
  stocks: defineTable({
    storeId: v.optional(v.id('stores')),
    productId: v.id('products'),
    userId: v.id('users'),
    quantity: v.number(),
  })
    .index('by_product', ['productId'])
    .index('by_product_user', ['productId', 'userId'])
    .index('by_user', ['userId'])
    .index('by_store', ['storeId']),

  // Correcciones de stock: cuando se recibió una cantidad equivocada y hay
  // que descontarla. Es historial, no se edita ni se borra; cada fila queda
  // como constancia de qué se corrigió, a quién y quién lo hizo.
  stockCorrections: defineTable({
    storeId: v.optional(v.id('stores')),
    productId: v.id('products'),
    userId: v.id('users'), // dueño del stock corregido
    performedBy: v.id('users'), // quién hizo la corrección
    quantity: v.number(), // unidades quitadas
    reason: v.literal('ingreso_incorrecto'),
  })
    .index('by_product', ['productId'])
    .index('by_store', ['storeId']),

  sales: defineTable({
    storeId: v.optional(v.id('stores')),
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
  })
    .index('by_user', ['userId'])
    .index('by_store', ['storeId']),
})
