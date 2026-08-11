# Alita Secos

Aplicación web para llevar el **inventario** y registrar las **ventas** de Alita Secos.

- **Inventario** (`/`): agregar productos, editar nombre y precio, reponer stock y eliminar productos.
- **Ventas** (`/ventas`): armar un carrito con varios productos y registrar la venta. El stock se descuenta solo, en una operación atómica.

Los datos se sincronizan en tiempo real: si registras una venta, el stock de la pantalla de Inventario se actualiza sin recargar la página.

## Tecnologías

| Pieza | Tecnología |
| --- | --- |
| Frontend | Vue 3 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 (paleta "maní con cáscara") |
| Backend y base de datos | Convex |
| Repositorio | GitHub |
| Hosting | Vercel |

## Requisitos

- Node.js 20 o superior
- Una cuenta en [Convex](https://convex.dev) y otra en [Vercel](https://vercel.com)

## Desarrollo local

```bash
npm install
```

En una terminal, levanta el backend de Convex (la primera vez pedirá iniciar sesión y crear el proyecto; genera `.env.local` con `VITE_CONVEX_URL`):

```bash
npx convex dev
```

En otra terminal, levanta el frontend:

```bash
npm run dev
```

La app queda en `http://localhost:5173`.

## Despliegue en Vercel

1. Importar el repositorio `sgiolpz/alita-secos` en Vercel (framework: **Vite**).
2. En el dashboard de Convex → *Settings* → *Deploy keys*, generar una **Production deploy key**.
3. En Vercel → *Settings* → *Environment Variables*, agregar `CONVEX_DEPLOY_KEY` con ese valor.
4. El *build command* ya viene definido en `vercel.json`:

   ```
   npx convex deploy --cmd 'npm run build'
   ```

   Ese comando publica las funciones de Convex en producción y le pasa la `VITE_CONVEX_URL` correcta al build de Vite.

## Estructura

```
convex/          Backend: esquema y funciones (queries y mutations)
  schema.ts      Tablas products y sales
  products.ts    list, add, update, addStock, remove
  sales.ts       list, create (descuenta stock de forma transaccional)
src/
  views/         Las dos pantallas: InventarioView y VentasView
  components/    Formulario, tabla, carrito e historial
  lib/           Formato de moneda/fecha y manejo de errores
  style.css      Tailwind + paleta de colores
```
