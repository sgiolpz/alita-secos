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
 * Recaudación agregada, con filtros opcionales por persona y por producto.
 *
 * Todo se suma a nivel de línea, no de venta: así, al filtrar por producto, el
 * monto es lo que aportó ese producto y no el total de las ventas donde
 * aparece. Sin filtros ambas cosas coinciden, porque el total de una venta es
 * la suma de sus líneas.
 *
 * `ventas` cuenta ventas distintas que tienen al menos una línea que pasa el
 * filtro, para que sumar por persona no infle el número.
 */
export const recaudacion = query({
  args: {
    token: v.string(),
    userId: v.optional(v.id('users')),
    productId: v.optional(v.id('products')),
  },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const [ventas, usuarios] = await Promise.all([
      ctx.db.query('sales').collect(),
      ctx.db.query('users').collect(),
    ])
    const nombrePorUsuario = new Map(usuarios.map((u) => [u._id as string, u.displayName]))

    interface Acumulado {
      clave: string
      nombre: string
      size?: number
      unit?: 'g' | 'un'
      total: number
      unidades: number
      ventas: Set<string>
    }

    const porUsuario = new Map<string, Acumulado>()
    const porProducto = new Map<string, Acumulado>()
    const ventasContadas = new Set<string>()
    let total = 0
    let unidades = 0

    const acumular = (
      mapa: Map<string, Acumulado>,
      clave: string,
      nombre: string,
      monto: number,
      cantidad: number,
      ventaId: string,
      extra?: { size?: number; unit?: 'g' | 'un' },
    ) => {
      let fila = mapa.get(clave)
      if (!fila) {
        fila = {
          clave,
          nombre,
          size: extra?.size,
          unit: extra?.unit,
          total: 0,
          unidades: 0,
          ventas: new Set(),
        }
        mapa.set(clave, fila)
      }
      fila.total += monto
      fila.unidades += cantidad
      fila.ventas.add(ventaId)
    }

    for (const venta of ventas) {
      if (args.userId && venta.userId !== args.userId) continue

      // Las ventas anteriores al reparto de stock no guardan quién vendió.
      const claveUsuario = venta.userId ?? 'sin-registrar'
      const nombreUsuario =
        venta.sellerName ??
        (venta.userId ? nombrePorUsuario.get(venta.userId) : undefined) ??
        'Sin registrar'

      for (const item of venta.items) {
        if (args.productId && item.productId !== args.productId) continue

        const monto = item.price * item.quantity
        total += monto
        unidades += item.quantity
        ventasContadas.add(venta._id)

        acumular(porUsuario, claveUsuario, nombreUsuario, monto, item.quantity, venta._id)
        acumular(porProducto, item.productId, item.name, monto, item.quantity, venta._id, {
          size: item.size,
          unit: item.unit,
        })
      }
    }

    const ordenar = (mapa: Map<string, Acumulado>) =>
      [...mapa.values()]
        .map((fila) => ({
          clave: fila.clave,
          nombre: fila.nombre,
          size: fila.size,
          unit: fila.unit,
          total: fila.total,
          unidades: fila.unidades,
          ventas: fila.ventas.size,
        }))
        // De mayor a menor recaudación; a igual monto, alfabético.
        .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'))

    return {
      total,
      unidades,
      ventas: ventasContadas.size,
      porUsuario: ordenar(porUsuario),
      porProducto: ordenar(porProducto),
    }
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
