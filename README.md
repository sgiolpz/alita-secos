# Alita Secos

Aplicación web para llevar el **inventario** y registrar las **ventas** de Alita Secos.

- **Ventas** (`/`): armar un carrito con varios productos y registrar la venta. El stock se descuenta solo, en una operación atómica. Es la primera pantalla al ingresar.
- **Inventario** (`/inventario`): quién tiene qué. Se recibe mercadería a nombre de una persona y se pueden traspasar unidades de una a otra.
- **Productos** (`/productos`): el catálogo. Crear productos con nombre, peso y precio, editarlos y eliminarlos.
- **Recaudación** (`/recaudacion`): cuánto entró, por persona y por producto, con filtros.
- **Administración** (`/administracion`): solo para el administrador global. Las tiendas y su gente.
- **Acceso** (`/login`): la app es privada. Sin sesión no se ve ninguna pantalla.

Un producto se define por su nombre y su **presentación**: 500 g, o 12 un. para lo que se vende por
cantidad. Por eso pueden coexistir "Maní con cáscara" de 250 g y de 500 g como productos distintos;
lo que no se permite es repetir la misma presentación.

**Cada tienda es una unidad autónoma.** La aplicación soporta varias tiendas: cada una tiene su
propio catálogo, su stock, sus ventas y su recaudación, y su gente solo ve lo suyo. Ver
[Tiendas y permisos](#tiendas-y-permisos).

**Dentro de una tienda el catálogo es compartido, la mercadería tiene dueño.** Todos los de la
tienda ven los mismos productos y el reparto completo del stock, pero cada quien vende solo lo suyo: al registrar una venta se descuenta
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

## Tiendas y permisos

Todo lo del negocio —productos, stock, correcciones, ventas— pertenece a una tienda (`storeId`), y
ninguna función devuelve filas de otra. El aislamiento vive en el backend, no en la interfaz:

- `requiereTienda()` (en `convex/model/tienda.ts`) es la puerta de entrada de toda query y mutation
  del negocio. La tienda sale **siempre** del usuario de la sesión; nunca se acepta un `storeId`
  enviado desde el navegador.
- Cuando una mutation recibe el id de un producto o de una persona, `productoDeTienda()` y
  `personaDeTienda()` exigen que sea de la misma tienda. Si es de otra, el mensaje es el mismo que si
  no existiera: desde afuera no se distingue un id ajeno de uno inventado.

Hay dos niveles de permiso:

| Rol | Qué puede hacer |
| --- | --- |
| `member` | Todo lo del día a día, **solo en su tienda**. |
| `admin` | Además, Administración: crear y editar tiendas, crear personas y asignarlas a una tienda. |

El administrador global ve la **estructura** (qué tiendas hay y quién trabaja en cada una), nunca el
inventario, las ventas ni la recaudación de una tienda que no sea la suya.

Una tienda nueva nace vacía y con todas las funciones disponibles: no hay nada que habilitar, basta
con asignarle gente. Desactivar una tienda conserva su historial pero le corta el acceso a su gente.

Cambiar a alguien de tienda exige que no le quede stock; sus ventas ya hechas se quedan en la tienda
donde ocurrieron.

### Migración inicial

Las filas creadas antes de que existieran las tiendas no tienen `storeId`. Al desplegar en un
entorno por primera vez hay que correr, **una vez**:

```bash
npx convex run migrations:inicializarMultiTienda
```

Crea la tienda "Alita", le asigna todo lo que no tenía tienda y deja a `sergio` como administrador
global. Es idempotente y acepta `{"storeName":"…","adminUsername":"…"}` para otro nombre. Agregar
`--prod` para hacerlo en producción. **Sin esta migración, en ese entorno nadie puede operar**: las
cuentas quedan sin tienda.

## Acceso y usuarios

La app **no tiene registro ni recuperación de contraseña**. El día a día de crear cuentas se hace
desde Administración; la terminal queda como puerta de rescate. Las contraseñas se guardan hasheadas con PBKDF2-SHA256 (100.000 iteraciones y sal por
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

## Entornos

Desarrollo y producción están separados de punta a punta: rama de git, deployment de Convex y base
de datos.

| | Desarrollo | Producción |
| --- | --- | --- |
| Rama de git | `dev` | `main` |
| Deployment de Convex | `disciplined-manatee-505` (dev) | `rare-trout-445` (prod) |
| Base de datos | de pruebas, desechable | datos reales del local |
| Cómo se actualiza | `npm run dev:convex` desde tu máquina | un push a `main`, que Vercel construye |

Todo el trabajo ocurre en `dev`. A `main` solo llega lo que se decide promover, y ese merge es una
decisión manual: nada lo hace de forma automática.

**El deployment de producción de Convex no se toca desde la máquina de nadie.** Solo lo actualiza el
build de Vercel cuando construye `main`, usando la `CONVEX_DEPLOY_KEY`. Por eso no existe un script
`deploy` en `package.json`: para que no haya forma de publicar a producción por accidente desde una
terminal.

El *build command* de `vercel.json` comprueba el entorno antes de tocar Convex:

```bash
if [ "$VERCEL_ENV" = "production" ]; then
  npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'
else
  npm run build   # los builds de rama no despliegan Convex
fi
```

Sin esa condición, cualquier push a una rama haría que Vercel corriera `convex deploy` con la clave
de producción y publicara código a medio hacer sobre los datos reales.

Además, `vercel.json` desactiva los despliegues automáticos de la rama `dev`:

```json
"git": { "deploymentEnabled": { "dev": false } }
```

Sin eso, un push a `dev` no tocaría Convex —lo impide la condición de arriba— pero Vercel igual
publicaría un *preview*. Ese build corre `npm run build` sin `VITE_CONVEX_URL`, así que quedaría una
URL pública con la app sin backend. El desarrollo se prueba en `localhost`, no en un preview.

## Desarrollo local

Primero, una vez:

```bash
npm install
```

Después, en una terminal el backend de Convex, que trabaja contra el deployment de **desarrollo**
indicado en `.env.local`:

```bash
npm run dev:convex
```

Y en otra terminal el frontend:

```bash
npm run dev
```

La app queda en `http://localhost:5174`, conectada a la base de datos de desarrollo. Puedes crear,
borrar y romper lo que necesites: nada de eso llega a producción.

## Promoción a producción

1. Verificar en `dev` que todo funciona (`npm run build` con typecheck limpio incluido).
2. Merge de `dev` a `main`.
3. Push de `main`. Vercel construye, `npx convex deploy` publica las funciones al deployment de
   producción y le pasa la `VITE_CONVEX_URL` correcta al build de Vite.
4. Si el cambio incluye migración de datos, correrla en producción con `npx convex run --prod`
   **después** de que el deploy haya terminado. Para el paso a multi-tienda:
   `npx convex run migrations:inicializarMultiTienda --prod`.

Vercel quedó configurado con la `CONVEX_DEPLOY_KEY` de producción del proyecto `alita-secos-08b0c`.
Esa clave debe ser una **production deploy key**: si es de desarrollo, el sitio publicado termina
hablándole a la base de datos de pruebas.

## Estructura

```
convex/           Backend: esquema y funciones (queries y mutations)
  schema.ts        Tablas stores, users, sessions, products, stocks,
                   stockCorrections y sales
  auth.ts          iniciarSesion, cerrarSesion, sesionActual, guardarUsuario (interna)
  admin.ts         Solo administrador global: tiendas, crearTienda, actualizarTienda,
                   usuarios, crearUsuario, actualizarUsuario
  migrations.ts    inicializarMultiTienda (interna, se corre una vez por entorno)
  users.ts         list: las personas de la tienda, para elegir dueño de stock
  model/auth.ts    Hasheo PBKDF2 y validación de sesión
  model/tienda.ts  requiereTienda y requiereAdmin: el aislamiento entre tiendas
  model/stock.ts   Lectura y ajuste del stock por persona
  products.ts      list, add, update, receiveStock, removeStock, corrections,
                   transferStock, remove
  sales.ts         list, recaudacion, create (transaccional)
src/
  views/          VentasView, InventarioView, ProductosView, RecaudacionView,
                  AdministracionView y LoginView
  components/     ProductForm y ProductCatalog (catálogo), StockTable y
                  StockCorrectionsHistory (inventario), SaleCart y SalesHistory
                  (ventas), RankingRecaudacion, TiendasPanel y UsuariosPanel
  router/         Rutas, guardia de sesión y guardia de administrador
  lib/            Sesión en el navegador, formato de moneda/fecha y errores
  style.css       Tailwind + paleta de colores
```
