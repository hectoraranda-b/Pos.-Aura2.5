# POS Backend — Node.js + TypeScript + Express + Prisma

Arquitectura inicial de backend para un sistema de punto de venta (POS).

## Stack

- **Express** — servidor HTTP / API REST
- **TypeScript** — tipado estático
- **Prisma ORM** — acceso a base de datos (PostgreSQL o MySQL)
- **JWT + bcrypt** — autenticación
- **Zod** — validación de datos de entrada

## Estructura de carpetas

```
pos-backend/
├── prisma/
│   ├── schema.prisma      # Modelos de base de datos
│   └── seed.ts            # Datos iniciales (usuario admin, producto demo)
├── src/
│   ├── config/             # env, cliente Prisma
│   ├── routes/              # Definición de endpoints por módulo
│   ├── controllers/         # Reciben req/res, delegan a services
│   ├── services/            # Lógica de negocio y acceso a datos (Prisma)
│   ├── middlewares/         # auth, validate, error handler
│   ├── validators/          # Esquemas Zod por módulo
│   ├── utils/                # ApiError, asyncHandler, period.ts (rangos de fecha por periodo)
│   ├── app.ts               # Configuración de Express
│   └── server.ts            # Punto de entrada
├── package.json
├── tsconfig.json
└── .env.example
```

## Módulos incluidos

| Módulo        | Tabla(s)                     | Notas                                                          |
|----------------|-------------------------------|------------------------------------------------------------------|
| Users          | `users`                       | Login JWT, roles ADMIN/MANAGER/CASHIER, passwords con bcrypt      |
| Categories     | `categories`                  | CRUD con baja lógica                                             |
| Products       | `products`                    | Crea su registro de `Inventory` en una transacción; costo y `minStock` |
| Inventory      | `inventory`                   | Ajustes de stock protegidos contra condiciones de carrera        |
| Customers      | `customers`                   | CRUD simple                                                      |
| Sales          | `sales`, `sales_details`      | **Transacción atómica** al vender (ver abajo); cancelación repone stock |
| Settings       | `store_settings`              | Registro único (singleton); datos fiscales, ticket, meta de ventas y config. de respaldo en la nube |
| Reports        | —                              | Agregaciones sobre `sales`/`sales_details` por periodo            |
| AI Analytics   | —                              | Reglas sobre velocidad de venta y antigüedad de movimiento        |
| Backup         | —                              | Exporta todas las tablas a `.json`; sincroniza a Drive/Dropbox/local |

## Transacción atómica de ventas

El punto crítico del sistema es `src/services/sale.service.ts` → `saleService.create()`.

Al registrar una venta, dentro de un único `prisma.$transaction(...)`:

1. Se valida que todos los productos existan y estén activos.
2. Por cada línea del carrito se descuenta el stock con
   `inventory.updateMany({ where: { quantity: { gte: cantidad } }, data: { quantity: { decrement: cantidad } } })`.
   Esta condición `gte` evita vender con stock insuficiente y protege contra
   condiciones de carrera si dos cajeros venden el mismo producto al mismo tiempo.
3. Se crea la cabecera del ticket (`Sale`) con folio, totales y forma de pago.
4. Se crean las líneas de detalle (`SalesDetail`).

**Si cualquier paso falla (stock insuficiente, producto inactivo, error de BD),
Prisma revierte automáticamente TODOS los cambios de la transacción.** No queda
stock descontado a medias ni tickets huérfanos sin detalle.

También existe `saleService.cancel()`, que repone el stock y marca la venta
como `CANCELLED`, igualmente dentro de una transacción.

## Instalación

```bash
npm install
cp .env.example .env
# edita .env con tu cadena de conexión real

npx prisma migrate dev --name init   # crea las tablas
npm run prisma:seed                  # (opcional) datos de prueba
npm run dev                          # levanta el servidor con recarga automática
```

> Si ya tenías la base de datos creada de una versión anterior de este proyecto
> (antes de `StoreSettings`, `Sale.cardReference`/`cardPaymentType`/`cancelled`,
> `Product`/`Inventory.minStock`, o los campos `cloud*` de `StoreSettings`),
> corre una migración adicional: `npx prisma migrate dev --name pos_aura_extensions`.

Usuario de prueba tras el seed: `admin@pos.com` / `Admin123!`

## Scripts disponibles

| Script                  | Descripción                                  |
|--------------------------|-----------------------------------------------|
| `npm run dev`            | Levanta el servidor en modo desarrollo (nodemon + ts-node) |
| `npm run build`          | Compila TypeScript a `dist/`                  |
| `npm start`              | Corre la versión compilada (producción)       |
| `npm run prisma:generate`| Regenera el cliente de Prisma                 |
| `npm run prisma:migrate` | Crea/aplica una migración en desarrollo       |
| `npm run prisma:deploy`  | Aplica migraciones en producción              |
| `npm run prisma:studio`  | Abre Prisma Studio (explorador visual de BD)  |
| `npm run prisma:seed`    | Ejecuta el seed inicial                       |
| `npm run lint`           | Corre ESLint                                  |
| `npm run format`         | Formatea el código con Prettier               |

## Endpoints principales

Todos bajo el prefijo `/api/v1`.

- `POST /users/login` — login, devuelve JWT
- `GET /users/me` — perfil del usuario autenticado
- `GET|POST /users`, `PUT|DELETE /users/:id` — CRUD de personal (`ADMIN`; `MANAGER` solo lectura)
- `GET|POST /categories`, `GET|PUT|DELETE /categories/:id`
- `GET|POST /products`, `GET|PUT|DELETE /products/:id`
- `GET /inventory`, `GET /inventory/:productId`, `POST /inventory/:productId/adjust`
- `GET|POST /customers`, `GET|PUT|DELETE /customers/:id`
- `GET /sales`, `GET /sales/:id`, `POST /sales` (registra el ticket), `POST /sales/:id/cancel`
- `GET|PUT /settings` — datos de la tienda, ticket, terminal integrada y meta de ventas (lectura para
  cualquier usuario autenticado; escritura solo `ADMIN`)
- `GET /reports/summary?period=daily|weekly|monthly|quarterly|annual` — ventas totales, costo,
  ganancia neta, IVA y avance de la meta configurada (`ADMIN`, `MANAGER`)
- `GET /ai-analytics` — combina los tres insights de una vez: `stockForecast`, `deadStock`,
  `executiveSummary` (también disponibles por separado en `/ai-analytics/stock-forecast`,
  `/ai-analytics/dead-stock`, `/ai-analytics/executive-summary`). Ver nota abajo.
- `GET /backup/export` — descarga un `.json` con todo el estado de la base de datos (`ADMIN`)
- `POST /backup/cloud/test` `{ provider, accessToken }` — valida el token contra la API real
  del proveedor y, si es válido, lo guarda y marca la cuenta como conectada (`ADMIN`)
- `POST /backup/cloud/sync` — genera un respaldo y lo sube al proveedor configurado en
  `StoreSettings` (`ADMIN`)
- `POST /backup/cloud/disconnect` — borra el token guardado y desmarca la conexión (`ADMIN`)

### Sobre el respaldo en la nube (`/backup/cloud/*`)

Esto **no es un flujo OAuth2 completo** (autorización con redirect, consentimiento,
refresh tokens, etc.) — eso requeriría que registres tu propia app en Google
Cloud Console o en el Dropbox App Console (con tu `client_id`/`client_secret`
y una URL de callback), algo que solo tú puedes hacer con tus credenciales.
En su lugar, `/backup/cloud/test` valida un **access token generado
manualmente** (Dropbox lo permite directo desde su App Console; para Google
Drive normalmente se genera con OAuth Playground o un script corto) llamando
al endpoint "quién soy" real de cada proveedor (`drive/v3/about` /
`users/get_current_account`). Si más adelante quieres el flujo completo de
"Conectar con Google"/"Conectar con Dropbox" con botón y redirect, lo puedo
construir, pero necesito que primero registres esas apps y me compartas
`client_id`/`client_secret` (como variables de entorno, nunca hardcodeados).

La sincronización automática (`cloudAutoSyncEnabled` + `cloudSyncFrequency`)
la ejecuta un scheduler simple dentro del propio proceso del servidor
(`src/jobs/cloudBackupScheduler.ts`), que revisa cada hora si ya toca
sincronizar. No es un cron real: si el servidor se reinicia justo antes de
que tocara, ese ciclo se pierde y se retoma en el siguiente chequeo. Para
producción con más garantías, esto debería moverse a un cron del sistema o a
una cola con persistencia — está señalado en un comentario en ese mismo
archivo.

El proveedor **Local** no requiere token: escribe el `.json` directo en una
carpeta `backups/` dentro del propio servidor (ya la agregué a `.gitignore`).
Es el único de los tres que pude probar end-to-end en este entorno, ya que
las APIs de Google/Dropbox no son alcanzables desde este sandbox — el código
de `GOOGLE_DRIVE`/`DROPBOX` está escrito contra la documentación oficial real
de cada API, pero te recomiendo probarlo con un token real en tu entorno
antes de confiar en él para producción.

Todas las rutas (excepto `/users/login`) requieren el header:
`Authorization: Bearer <token>`

### Sobre `/ai-analytics`

Este módulo **no llama a un modelo de lenguaje externo**: es un motor de reglas
determinísticas sobre tus propios datos de ventas e inventario (velocidad de
venta de los últimos 30 días, antigüedad del último movimiento, etc.). El
"resumen ejecutivo" se redacta con una plantilla de texto a partir de esos
mismos números, no con un LLM. El servicio (`aiAnalytics.service.ts`) ya deja
los datos agregados listos por si más adelante quieres pasárselos como
contexto a un prompt real (p. ej. contra la API de Claude) para una redacción
más rica — puedo ayudarte a conectar eso si lo necesitas.

## Cambiar entre PostgreSQL y MySQL

En `prisma/schema.prisma`, cambia `provider = "postgresql"` por `provider = "mysql"`
en el bloque `datasource db`, y ajusta `DATABASE_URL` en `.env` con el formato correspondiente.
