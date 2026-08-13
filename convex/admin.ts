import { ConvexError, v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { hashearPassword, normalizarUsuario } from './model/auth'
import { requiereAdmin } from './model/tienda'

/**
 * Administración global: crear y editar tiendas, y crear y editar a su gente.
 *
 * Todo lo de aquí exige `requiereAdmin`. Es el único módulo que ve más de una
 * tienda a la vez, y aun así solo ve la estructura —quién trabaja dónde—,
 * nunca el inventario, las ventas ni la recaudación de una tienda ajena.
 */

const rolValidador = v.union(v.literal('admin'), v.literal('member'))

function nombreDeTienda(crudo: string): string {
  const name = crudo.trim()
  if (name.length === 0) {
    throw new ConvexError('El nombre de la tienda es obligatorio.')
  }
  return name
}

/** Falla si ya hay otra tienda con ese nombre, sin importar mayúsculas. */
async function exigirNombreLibre(
  ctx: MutationCtx,
  name: string,
  excepto?: Id<'stores'>,
): Promise<void> {
  const tiendas = await ctx.db.query('stores').collect()
  const chocada = tiendas.find(
    (tienda) => tienda._id !== excepto && tienda.name.toLowerCase() === name.toLowerCase(),
  )
  if (chocada) {
    throw new ConvexError(`Ya existe una tienda llamada "${chocada.name}".`)
  }
}

/** Cierra las sesiones abiertas de alguien: se usa al cambiarle la contraseña. */
async function cerrarSesionesDe(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const sesiones = await ctx.db
    .query('sessions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  for (const sesion of sesiones) {
    await ctx.db.delete(sesion._id)
  }
}

/** Las tiendas con su tamaño, para el panel de administración. */
export const tiendas = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requiereAdmin(ctx, args.token)

    const tiendas = await ctx.db.query('stores').collect()

    const filas = await Promise.all(
      tiendas.map(async (tienda) => {
        const [usuarios, productos, ventas] = await Promise.all([
          ctx.db
            .query('users')
            .withIndex('by_store', (q) => q.eq('storeId', tienda._id))
            .collect(),
          ctx.db
            .query('products')
            .withIndex('by_store', (q) => q.eq('storeId', tienda._id))
            .collect(),
          ctx.db
            .query('sales')
            .withIndex('by_store', (q) => q.eq('storeId', tienda._id))
            .collect(),
        ])
        return {
          _id: tienda._id,
          _creationTime: tienda._creationTime,
          name: tienda.name,
          active: tienda.active,
          usuarios: usuarios.length,
          productos: productos.length,
          ventas: ventas.length,
        }
      }),
    )

    return filas.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
})

/**
 * Crea una tienda. Nace vacía y con todas las funciones de la app
 * disponibles: no hay nada que habilitar, alcanza con darle gente.
 */
export const crearTienda = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await requiereAdmin(ctx, args.token)

    const name = nombreDeTienda(args.name)
    await exigirNombreLibre(ctx, name)

    return await ctx.db.insert('stores', { name, active: true })
  },
})

/** Renombra una tienda o la activa/desactiva. */
export const actualizarTienda = mutation({
  args: {
    token: v.string(),
    id: v.id('stores'),
    name: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requiereAdmin(ctx, args.token)

    const tienda = await ctx.db.get(args.id)
    if (!tienda) {
      throw new ConvexError('Esa tienda ya no existe.')
    }

    const name = nombreDeTienda(args.name)
    await exigirNombreLibre(ctx, name, args.id)

    await ctx.db.patch(args.id, { name, active: args.active })
  },
})

/** Toda la gente, con la tienda a la que pertenece. Sin hashes ni sales. */
export const usuarios = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requiereAdmin(ctx, args.token)

    const [gente, tiendas] = await Promise.all([
      ctx.db.query('users').collect(),
      ctx.db.query('stores').collect(),
    ])
    const nombrePorTienda = new Map(tiendas.map((tienda) => [tienda._id as string, tienda.name]))

    return gente
      .map((usuario) => ({
        _id: usuario._id,
        username: usuario.username,
        displayName: usuario.displayName,
        role: usuario.role === 'admin' ? ('admin' as const) : ('member' as const),
        storeId: usuario.storeId ?? null,
        storeName: usuario.storeId ? (nombrePorTienda.get(usuario.storeId) ?? '') : '',
      }))
      .sort(
        (a, b) =>
          a.storeName.localeCompare(b.storeName, 'es') ||
          a.displayName.localeCompare(b.displayName, 'es'),
      )
  },
})

export const crearUsuario = mutation({
  args: {
    token: v.string(),
    username: v.string(),
    displayName: v.string(),
    password: v.string(),
    storeId: v.id('stores'),
    role: rolValidador,
  },
  handler: async (ctx, args) => {
    await requiereAdmin(ctx, args.token)

    const username = normalizarUsuario(args.username)
    if (!username) {
      throw new ConvexError('El nombre de usuario es obligatorio.')
    }
    const displayName = args.displayName.trim()
    if (!displayName) {
      throw new ConvexError('El nombre visible es obligatorio.')
    }
    if (args.password.length < 4) {
      throw new ConvexError('La contraseña debe tener al menos 4 caracteres.')
    }

    const tienda = await ctx.db.get(args.storeId)
    if (!tienda) {
      throw new ConvexError('Esa tienda ya no existe.')
    }

    // El usuario es único en toda la aplicación, no por tienda: con él se
    // entra, y al escribirlo en el login todavía no se sabe de qué tienda es.
    const existente = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first()
    if (existente) {
      throw new ConvexError(`El usuario "${username}" ya está tomado.`)
    }

    const { salt, hash } = await hashearPassword(args.password)

    return await ctx.db.insert('users', {
      username,
      displayName,
      passwordHash: hash,
      passwordSalt: salt,
      storeId: args.storeId,
      role: args.role,
    })
  },
})

/**
 * Edita a una persona: nombre visible, tienda, rol y, si se indica,
 * contraseña nueva.
 *
 * Cambiar de tienda exige que no le quede stock: la mercadería es de la tienda
 * donde se recibió, así que primero hay que traspasarla o corregirla. Sus
 * ventas ya hechas se quedan donde ocurrieron, que es lo correcto.
 */
export const actualizarUsuario = mutation({
  args: {
    token: v.string(),
    id: v.id('users'),
    displayName: v.string(),
    storeId: v.id('stores'),
    role: rolValidador,
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requiereAdmin(ctx, args.token)

    const usuario = await ctx.db.get(args.id)
    if (!usuario) {
      throw new ConvexError('Esa persona ya no existe.')
    }

    const displayName = args.displayName.trim()
    if (!displayName) {
      throw new ConvexError('El nombre visible es obligatorio.')
    }

    const tienda = await ctx.db.get(args.storeId)
    if (!tienda) {
      throw new ConvexError('Esa tienda ya no existe.')
    }

    // Sin esto, un descuido dejaría a la aplicación sin nadie que la administre.
    if (usuario._id === admin._id && args.role !== 'admin') {
      throw new ConvexError('No puedes quitarte a ti mismo el rol de administrador.')
    }

    if (usuario.storeId && usuario.storeId !== args.storeId) {
      const conStock = await ctx.db
        .query('stocks')
        .withIndex('by_user', (q) => q.eq('userId', args.id))
        .collect()
      const unidades = conStock.reduce((suma, fila) => suma + fila.quantity, 0)
      if (unidades > 0) {
        throw new ConvexError(
          `${usuario.displayName} todavía tiene ${unidades} unidades en su tienda actual. Traspásalas o corrígelas antes de cambiarle la tienda.`,
        )
      }
    }

    await ctx.db.patch(args.id, {
      displayName,
      storeId: args.storeId,
      role: args.role,
    })

    if (args.password) {
      if (args.password.length < 4) {
        throw new ConvexError('La contraseña debe tener al menos 4 caracteres.')
      }
      const { salt, hash } = await hashearPassword(args.password)
      await ctx.db.patch(args.id, { passwordHash: hash, passwordSalt: salt })
      await cerrarSesionesDe(ctx, args.id)
    }
  },
})
