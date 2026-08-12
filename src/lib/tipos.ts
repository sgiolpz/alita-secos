import type { FunctionReturnType } from 'convex/server'

import type { api } from '../../convex/_generated/api'

/** Un producto tal como lo devuelve `products.list`: catálogo + reparto de stock. */
export type Producto = FunctionReturnType<typeof api.products.list>[number]

/** Una persona del local, para elegir dueño de stock. */
export type Usuario = FunctionReturnType<typeof api.users.list>[number]

/** Una venta registrada, con sus líneas. */
export type Venta = FunctionReturnType<typeof api.sales.list>[number]

/** Recaudación agregada con los filtros aplicados. */
export type Recaudacion = FunctionReturnType<typeof api.sales.recaudacion>

/** Una fila del ranking de recaudación, sea de persona o de producto. */
export type FilaRecaudacion = Recaudacion['porUsuario'][number]

/** Una corrección de stock registrada (ingreso incorrecto, ya descontado). */
export type Correccion = FunctionReturnType<typeof api.products.corrections>[number]
