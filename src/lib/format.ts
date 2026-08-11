const moneda = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const numero = new Intl.NumberFormat('es-CL')

const fechaHora = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
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

/** Formatea el `_creationTime` de Convex (milisegundos) como fecha y hora local. */
export function formatearFecha(ms: number): string {
  return fechaHora.format(new Date(ms))
}
