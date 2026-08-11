# Alita Secos

Aplicación web para llevar el **inventario** y registrar las **ventas** de Alita Secos.

- **Ventas** (`/`): armar un carrito con varios productos y registrar la venta. El stock se descuenta solo, en una operación atómica. Es la primera pantalla al ingresar.
- **Inventario** (`/inventario`): quién tiene qué. Se recibe mercadería a nombre de una persona y se pueden traspasar unidades de una a otra.
- **Productos** (`/productos`): el catálogo. Crear productos con nombre, peso y precio, editarlos y eliminarlos.
- **Acceso** (`/login`): la app es privada. Sin sesión no se ve ninguna pantalla.

Un producto se define por su nombre y su **presentación**: 500 g, o 12 un. para lo que se vende por
cantidad. Por eso pueden coexistir "Maní con cáscara" de 250 g y de 500 g como productos distintos;
lo que no se permite es repetir la misma presentación.

**El catálogo es compartido, la mercadería tiene dueño.** Todos ven los mismos productos y el
reparto completo del stock, pero cada quien vende solo lo suyo: al registrar una venta se descuenta
del stock de quien inició sesión, y la venta queda a su nombre. Los productos nacen sin stock; la
mercadería se recibe después, a nombre de quien la va a vender.

Los datos se sincronizan en tiempo real: si registras una venta, el stock de la pantalla de Inventario se actualiza sin recargar la página.

## Tecnologías

| Pieza | Tecnología |
| --- | --- |
| Frontend | Vue 3 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 (paleta "maní con cáscara") |
| Backend y base de datos | Convex |
| Repositorio | GitHub |
| Hosting | Vercel |

## Acceso y usuarios

La app **no tiene registro ni recuperación de contraseña**: las cuentas se crean a mano desde la
terminal. Las contraseñas se guardan hasheadas con PBKDF2-SHA256 (100.000 iteraciones y sal por
usuario), nunca en texto plano.

Toda query y mutation del backend exige un token de sesión válido, así que la protección no es solo
de interfaz: sin iniciar sesión tampoco se puede leer ni escribir llamando a la API directamente.

Para crear un usuario o cambiarle la contraseña:

```bash
npx convex run auth:guardarUsuario '{"username":"nombre","displayName":"Nombre","password":"nueva-clave"}'
```

Agregar `--prod` para hacerlo en producción en vez del deployment de desarrollo. Si el usuario ya
existe, se le actualiza la contraseña y se cierran sus sesiones abiertas. La función es
`internalMutation`, o sea que no se puede llamar desde el navegador.

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

1. En el [dashboard de Convex](https://dashboard.convex.dev), proyecto `alita-secos`, cambiar al
   deployment **Production** → *Settings* → *Deploy keys* → **Generate a production deploy key**.
2. En [vercel.com/new](https://vercel.com/new), importar el repositorio `sgiolpz/alita-secos`
   (Vercel detecta **Vite** solo).
3. Antes de dar *Deploy*, en *Environment Variables* agregar:

   | Name | Value |
   | --- | --- |
   | `CONVEX_DEPLOY_KEY` | la clave generada en el paso 1 |

4. *Deploy*. No hace falta tocar nada más: el *build command* ya viene en `vercel.json`

   ```
   npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'
   ```

   Ese comando publica las funciones de Convex en producción y le pasa la `VITE_CONVEX_URL`
   correcta al build de Vite. Desde ahí, cada push a `main` redespliega frontend y backend.

## Estructura

```
convex/          Backend: esquema y funciones (queries y mutations)
  schema.ts       Tablas users, sessions, products, stocks y sales
  auth.ts         iniciarSesion, cerrarSesion, sesionActual, guardarUsuario (interna)
  users.ts        list: las personas del local, para elegir dueño de stock
  model/auth.ts   Hasheo PBKDF2 y validación de sesión, reutilizados por el resto
  model/stock.ts  Lectura y ajuste del stock por persona
  products.ts     list, add, update, receiveStock, transferStock, remove
  sales.ts        list, create (descuenta del vendedor, de forma transaccional)
src/
  views/         VentasView, InventarioView, ProductosView y LoginView
  components/    ProductForm y ProductCatalog (catálogo), StockTable (inventario),
                 SaleCart y SalesHistory (ventas)
  router/        Rutas y guardia que exige sesión
  lib/           Sesión en el navegador, formato de moneda/fecha y errores
  style.css      Tailwind + paleta de colores
```
