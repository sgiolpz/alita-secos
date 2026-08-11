import type { FunctionReturnType } from 'convex/server'

import type { api } from '../../convex/_generated/api'

/** Un producto tal como lo devuelve `products.list`: catálogo + reparto de stock. */
export type Producto = FunctionReturnType<typeof api.products.list>[number]

/** Una persona del local, para elegir dueño de stock. */
export type Usuario = FunctionReturnType<typeof api.users.list>[number]
