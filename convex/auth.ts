import { ConvexError, v } from 'convex/values'

import { internalMutation, mutation, query } from './_generated/server'
import {
  hashearPassword,
  normalizarUsuario,
  nuevoToken,
  passwordCoincide,
  usuarioDeSesion,
  vencimientoSesion,
} from './model/auth'

const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos.'

/** Datos de la sesión abierta, o `null` si el token ya no sirve. */
export const sesionActual = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const usuario = await usuarioDeSesion(ctx, args.token)
    if (!usuario) return null
    return { username: usuario.username, displayName: usuario.displayName }
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

    const token = nuevoToken()
    await ctx.db.insert('sessions', {
      userId: usuario._id,
      token,
      expiresAt: vencimientoSesion(),
    })

    return {
      token,
      username: usuario.username,
      displayName: usuario.displayName,
    }
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
 * Así la app no tiene registro abierto.
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
    })
    return `Usuario "${username}" creado.`
  },
})
