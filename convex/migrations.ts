import { ConvexError, v } from 'convex/values'

import { internalMutation } from './_generated/server'

/**
 * Deja la base lista para trabajar con varias tiendas.
 *
 * Todo lo que existía se creó cuando la aplicación tenía una sola tienda, así
 * que no tiene `storeId`. Esto crea esa tienda, le asigna todo lo huérfano y
 * nombra al administrador global.
 *
 * Es `internalMutation` y se corre desde la terminal:
 *   npx convex run migrations:inicializarMultiTienda
 *
 * Se puede correr las veces que sea: solo toca lo que todavía no tiene tienda.
 */
export const inicializarMultiTienda = internalMutation({
  args: {
    storeName: v.optional(v.string()),
    adminUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const storeName = (args.storeName ?? 'Alita').trim()
    const adminUsername = (args.adminUsername ?? 'sergio').trim().toLowerCase()

    const existente = await ctx.db
      .query('stores')
      .withIndex('by_name', (q) => q.eq('name', storeName))
      .first()

    const storeId = existente?._id ?? (await ctx.db.insert('stores', { name: storeName, active: true }))
    const pasos: string[] = [existente ? `Tienda "${storeName}" ya existía.` : `Tienda "${storeName}" creada.`]

    const usuarios = await ctx.db.query('users').collect()
    if (!usuarios.some((usuario) => usuario.username === adminUsername)) {
      throw new ConvexError(
        `No existe el usuario "${adminUsername}", que debía quedar como administrador global.`,
      )
    }

    let asignados = 0
    let administradores = 0
    for (const usuario of usuarios) {
      const cambios: Record<string, unknown> = {}
      if (!usuario.storeId) {
        cambios.storeId = storeId
        asignados++
      }
      const rol = usuario.username === adminUsername ? 'admin' : 'member'
      if (usuario.role !== rol) {
        cambios.role = rol
        if (rol === 'admin') administradores++
      }
      if (Object.keys(cambios).length > 0) {
        await ctx.db.patch(usuario._id, cambios)
      }
    }
    pasos.push(`${asignados} usuarios asignados a la tienda.`)
    pasos.push(`${administradores} administrador global definido (${adminUsername}).`)

    // El resto de las tablas: todo lo que no tiene tienda pasa a ser de esta.
    for (const tabla of ['products', 'stocks', 'stockCorrections', 'sales'] as const) {
      const filas = await ctx.db.query(tabla).collect()
      let movidas = 0
      for (const fila of filas) {
        if (!fila.storeId) {
          await ctx.db.patch(fila._id, { storeId })
          movidas++
        }
      }
      pasos.push(`${tabla}: ${movidas} filas asignadas.`)
    }

    return pasos.join('\n')
  },
})
