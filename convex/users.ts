import { v } from 'convex/values'

import { query } from './_generated/server'
import { requiereUsuario } from './model/auth'

/**
 * Las personas del local, para elegir a quién se le entrega el stock.
 * Nunca devuelve hashes ni sales: solo lo necesario para mostrar y elegir.
 */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requiereUsuario(ctx, args.token)

    const usuarios = await ctx.db.query('users').collect()
    return usuarios
      .map((usuario) => ({
        _id: usuario._id,
        username: usuario.username,
        displayName: usuario.displayName,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
  },
})
