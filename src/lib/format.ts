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

/** Formatea el `_creationTime` de Convex (milisegundos) como fecha y hora local. */
export function formatearFecha(ms: number): string {
  return fechaHora.format(new Date(ms))
}
