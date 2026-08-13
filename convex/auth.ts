import { ConvexError, v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import {
  hashearPassword,
  normalizarUsuario,
  nuevoToken,
  passwordCoincide,
  usuarioDeSesion,
  vencimientoSesion,
} from './model/auth'
import { esAdmin } from './model/tienda'

const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos.'
const TIENDA_INACTIVA = 'Tu tienda está desactivada. Habla con el administrador.'

/**
 * Lo que el navegador necesita saber de la sesión: quién es, de qué tienda y
 * si administra. Nunca sale de aquí nada sensible.
 *
 * La tienda viaja para poder mostrarla, no para filtrar: el `storeId` que usan
 * las funciones del negocio siempre se relee del usuario en el servidor.
 */
async function datosDeSesion(ctx: QueryCtx, usuario: Doc<'users'>) {
  const tienda = usuario.storeId ? await ctx.db.get(usuario.storeId) : null
  return {
    username: usuario.username,
    displayName: usuario.displayName,
    role: esAdmin(usuario) ? ('admin' as const) : ('member' as const),
    storeId: tienda?._id ?? null,
    storeName: tienda?.name ?? '',
  }
}

/** Datos de la sesión abierta, o `null` si el token ya no sirve. */
export const sesionActual = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const usuario = await usuarioDeSesion(ctx, args.token)
    if (!usuario) return null
    return await datosDeSesion(ctx, usuario)
  },
})

export const iniciarSesion = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizarUsuario(args.username)

    const usuario = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first()

    // Mismo mensaje exista o no el usuario: no se filtra qué nombres son válidos.
    if (!usuario || !(await passwordCoincide(usuario, args.password))) {
      throw new ConvexError(CREDENCIALES_INVALIDAS)
    }

    // Una tienda desactivada no deja entrar a su gente. El administrador global
    // sí entra igual: es quien tiene que poder volver a activarla.
    if (!esAdmin(usuario)) {
      const tienda = usuario.storeId ? await ctx.db.get(usuario.storeId) : null
      if (tienda && !tienda.active) {
        throw new ConvexError(TIENDA_INACTIVA)
      }
    }

    const token = nuevoToken()
    await ctx.db.insert('sessions', {
      userId: usuario._id,
      token,
      expiresAt: vencimientoSesion(),
    })

    return { token, ...(await datosDeSesion(ctx, usuario)) }
  },
})

export const cerrarSesion = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const sesion = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()
    if (sesion) {
      await ctx.db.delete(sesion._id)
    }
  },
})

/**
 * Crea un usuario o le cambia la contraseña.
 *
 * Es `internalMutation`: no se puede llamar desde el navegador, solo desde la
 * terminal con `npx convex run auth:guardarUsuario ...` o desde el dashboard.
 * Es la puerta de rescate para el administrador global; el día a día de crear
 * usuarios se hace desde Administración.
 */
export const guardarUsuario = internalMutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizarUsuario(args.username)
    if (!username) {
      throw new ConvexError('El nombre de usuario es obligatorio.')
    }
    if (args.password.length < 4) {
      throw new ConvexError('La contraseña debe tener al menos 4 caracteres.')
    }

    const { salt, hash } = await hashearPassword(args.password)

    const existente = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .first()

    if (existente) {
      await ctx.db.patch(existente._id, {
        displayName: args.displayName,
        passwordHash: hash,
        passwordSalt: salt,
      })

      // Cambiar la contraseña cierra las sesiones abiertas de ese usuario.
      const sesiones = await ctx.db
        .query('sessions')
        .withIndex('by_user', (q) => q.eq('userId', existente._id))
        .collect()
      for (const sesion of sesiones) {
        await ctx.db.delete(sesion._id)
      }

      return `Usuario "${username}" actualizado.`
    }

    await ctx.db.insert('users', {
      username,
      displayName: args.displayName,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'member',
    })
    return `Usuario "${username}" creado.`
  },
})
