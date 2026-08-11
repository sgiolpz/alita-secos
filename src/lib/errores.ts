import { ConvexError } from 'convex/values'

/**
 * Convierte un error de Convex en un mensaje legible.
 *
 * El backend lanza `ConvexError` con un texto en español; ese texto viaja en
 * `error.data`. Cualquier otra excepción cae al mensaje genérico.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ConvexError) {
    return typeof error.data === 'string' ? error.data : JSON.stringify(error.data)
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.'
}
