import { ConvexError, v } from 'convex/values'

import { internalMutation } from './_generated/server'

/**
 * Migración de un solo uso: pasa el `stock` que vivía en cada producto a la
 * tabla `stocks`, a nombre de la persona indicada, y limpia el campo antiguo.
 *
 * Se ejecuta desde la terminal y se elimina apenas termina:
 *   npx convex run migracionStock:mover '{"username":"sergio"}'
 */
export const mover = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const usuario = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()
    if (!usuario) {
      throw new ConvexError(`No existe el usuario "${args.username}".`)
    }

    const productos = await ctx.db.query('products').collect()
    let unidadesMovidas = 0
    let camposLimpiados = 0

    for (const producto of productos) {
      const antiguo = producto.stock ?? 0

      if (antiguo > 0) {
        const existente = await ctx.db
          .query('stocks')
          .withIndex('by_product_user', (q) =>
            q.eq('productId', producto._id).eq('userId', usuario._id),
          )
          .first()

        if (existente) {
          await ctx.db.patch(existente._id, { quantity: existente.quantity + antiguo })
        } else {
          await ctx.db.insert('stocks', {
            productId: producto._id,
            userId: usuario._id,
            quantity: antiguo,
          })
        }
        unidadesMovidas += antiguo
      }

      if (producto.stock !== undefined) {
        await ctx.db.patch(producto._id, { stock: undefined })
        camposLimpiados++
      }
    }

    return `${unidadesMovidas} unidades quedaron a nombre de ${usuario.displayName}. Campo antiguo limpiado en ${camposLimpiados} de ${productos.length} productos.`
  },
})
