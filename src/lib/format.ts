const moneda = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const numero = new Intl.NumberFormat('es-CL')

const hora = new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' })

const diaDeEsteAno = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const diaDeOtroAno = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Formatea un monto en pesos chilenos, sin decimales. */
export function formatearMoneda(valor: number): string {
  return moneda.format(valor)
}

/** Formatea una cantidad con separador de miles. */
export function formatearNumero(valor: number): string {
  return numero.format(valor)
}

export type UnidadProducto = 'g' | 'un'

export const UNIDADES: { valor: UnidadProducto; etiqueta: string }[] = [
  { valor: 'g', etiqueta: 'gramos' },
  { valor: 'un', etiqueta: 'unidades' },
]

/**
 * Presentación del producto: "500 g" o "12 un.".
 * Devuelve "—" para los productos creados antes de que existiera el campo.
 */
export function formatearMedida(size?: number, unit?: UnidadProducto): string {
  if (size === undefined || unit === undefined) return '—'
  return unit === 'g' ? `${numero.format(size)} g` : `${numero.format(size)} un.`
}

/** Nombre con su presentación: "Maní con cáscara 500 g". */
export function nombreCompleto(name: string, size?: number, unit?: UnidadProducto): string {
  if (size === undefined || unit === undefined) return name
  return `${name} ${formatearMedida(size, unit)}`
}

/** Solo la hora: "7:28 p. m.". El día se muestra una vez, agrupando. */
export function formatearHora(ms: number): string {
  return hora.format(new Date(ms))
}

/** Identifica el día natural de una marca de tiempo, para agrupar por jornada. */
export function claveDia(ms: number): string {
  const f = new Date(ms)
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`
}

/** "Hoy", "Ayer" o "Martes 11 de agosto". */
export function formatearDia(ms: number): string {
  const f = new Date(ms)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)

  if (claveDia(ms) === claveDia(hoy.getTime())) return 'Hoy'
  if (claveDia(ms) === claveDia(ayer.getTime())) return 'Ayer'

  const texto =
    f.getFullYear() === hoy.getFullYear() ? diaDeEsteAno.format(f) : diaDeOtroAno.format(f)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
