# POS Frontend — React + Vite + TypeScript + Tailwind

Interfaz de punto de venta que consume el backend del sistema POS.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** — sistema de diseño propio (ver `tailwind.config.js`)
- **axios** — cliente HTTP con interceptores de JWT
- **react-router-dom** — enrutamiento y ruta protegida
- **lucide-react** — iconografía

## Instalación

```bash
# 1. Crear el proyecto (ya hecho en este entregable, referencia para el futuro)
npm create vite@latest pos-frontend -- --template react-ts
cd pos-frontend

# 2. Instalar dependencias del proyecto
npm install

# 3. Librerías adicionales usadas
npm install axios react-router-dom lucide-react clsx

# 4. Tailwind CSS
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p

# 5. Variables de entorno
cp .env.example .env
# Ajusta VITE_API_URL si tu backend no corre en localhost:3000

# 6. Levantar en desarrollo
npm run dev
```

El backend debe estar corriendo en `http://localhost:3000` (ver el proyecto
`pos-backend`). **Importante**: el backend expone sus rutas bajo el prefijo
`/api/v1` (no solo `/api`), por eso `VITE_API_URL` apunta por defecto a
`http://localhost:3000/api/v1`. Si cambias el prefijo en el backend, actualiza
esta variable.

## Estructura

```
src/
├── api/                  # Cliente axios + funciones por módulo
│   ├── client.ts          # baseURL, interceptor de token JWT, manejo de 401
│   ├── auth.ts
│   ├── categories.ts
│   ├── products.ts
│   ├── inventory.ts
│   ├── sales.ts
│   ├── users.ts
│   ├── settings.ts
│   ├── reports.ts
│   ├── aiAnalytics.ts
│   └── backup.ts
├── context/
│   ├── AuthContext.tsx     # Sesión: usuario actual, login, logout
│   └── SettingsContext.tsx # Configuración de tienda (fetch a /api/settings)
├── components/
│   ├── ProtectedRoute.tsx  # Ruta protegida, con soporte de restricción por rol
│   ├── layout/
│   │   └── AppShell.tsx     # Barra superior + navegación compartida entre pantallas
│   ├── users/
│   │   └── UserFormModal.tsx
│   ├── settings/
│   │   └── LogoUploader.tsx
│   ├── inventory/
│   │   ├── ProductFormModal.tsx
│   │   └── StockAdjustModal.tsx
│   ├── sales/
│   │   └── SaleDetailModal.tsx
│   └── pos/
│       ├── ProductSearch.tsx     # Buscador + lector de código de barras
│       ├── CartTable.tsx          # Tabla de la venta actual
│       ├── SaleSummary.tsx        # Resumen (subtotal/impuesto/total)
│       ├── SaleModeToggle.tsx     # Switch Público general / Facturado
│       ├── PaymentPanel.tsx       # Método de pago + calculadora de cambio
│       ├── CardPaymentModal.tsx   # Flujo híbrido de cobro con tarjeta
│       └── SaleSuccessModal.tsx   # Confirmación tras cobrar
├── pages/
│   ├── LoginPage.tsx
│   ├── POSPage.tsx           # / — pantalla principal del cajero
│   ├── InventoryPage.tsx     # /inventory
│   ├── SalesHistoryPage.tsx  # /sales
│   ├── ReportsPage.tsx       # /reports
│   ├── AnalyticsPage.tsx     # /analytics — asistente de inventario
│   ├── UsersPage.tsx         # /users
│   └── SettingsPage.tsx      # /settings
├── types/index.ts         # Tipos que reflejan los modelos del backend
├── lib/format.ts          # formatCurrency, toNumber
├── App.tsx                 # Todas las rutas
└── main.tsx
```

## Módulos

### Usuarios (`/users`)

Tabla del personal (nombre, correo, rol, estado) contra `GET /users`. Solo
`ADMIN` puede crear, editar o desactivar (`POST` / `PUT` / `DELETE /users/:id`,
que en el backend hace baja lógica); `MANAGER` puede ver la lista pero no
modificarla (así lo exige el backend). Un `ADMIN` no puede desactivarse a sí
mismo desde la tabla. Ruta protegida para `ADMIN` y `MANAGER`.

### Configuración (`/settings`)

Formulario de datos de la tienda (nombre, RFC, dirección, teléfono, logo),
mensaje al pie del ticket, preferencia de IVA desglosado por defecto,
switch de terminal integrada vs. manual, meta de ventas y botón de respaldo.
Se lee/escribe contra `GET`/`PUT /settings` (registro único en el backend,
compartido por todas las terminales — ya no vive en `localStorage`). El logo
se convierte a base64 en el cliente antes de enviarse. Ruta protegida para
`ADMIN` (escritura); `SettingsContext` expone la configuración de lectura a
toda la app (incluyendo el POS, para saber si la terminal es integrada).

### Pago con tarjeta (flujo híbrido)

Al elegir "Tarjeta" y pulsar **Cobrar**, se abre `CardPaymentModal` en vez de
cobrar directo. El comportamiento depende de `settings.integratedTerminalEnabled`
(configurable en `/settings`):

- **Terminal integrada (activada)**: simula la espera de la terminal
  ("Esperando respuesta de la terminal…", con animación NFC) durante ~1.8s
  — el punto donde, en una integración real, se conectaría el SDK de la
  terminal —, luego aprueba sola y genera una referencia simulada
  (`cardPaymentType: "INTEGRATED"`). No se le pide nada al cajero.
- **Terminal manual (desactivada)**: salta directo a un formulario que
  **exige** el número de autorización/folio impreso en el voucher de una
  terminal física independiente (Clip, Mercado Pago Smart, etc.), ya que en
  este caso el sistema no tiene forma propia de confirmar el cobro
  (`cardPaymentType: "MANUAL"`).

Al confirmar, se llama `POST /sales` con `paymentMethod: "CARD"`,
`cardReference` y `cardPaymentType`. La referencia capturada se muestra en el
ticket de confirmación (`SaleSuccessModal`) y en el detalle del historial de
ventas cuando el método de pago fue tarjeta.

### Inventario (`/inventory`), Historial de ventas (`/sales`), Reportes (`/reports`) y Asistente IA (`/analytics`)

Los cuatro consumen los módulos nuevos del backend (`/products`+`/inventory`,
`/sales`, `/reports`, `/ai-analytics`) y están protegidos para `ADMIN` y
`MANAGER` (el `CASHIER` solo ve `/` — el POS). Puntos a tener en cuenta:

- **Inventario**: crear/editar producto usa `POST`/`PUT /products`; el botón
  "Ajustar stock" usa `POST /inventory/:productId/adjust` por separado —
  intencionalmente no se puede cambiar el stock actual desde el formulario de
  edición, para dejar rastro de cada movimiento.
- **Historial de ventas**: cancelar una venta llama `POST /sales/:id/cancel`,
  que repone el stock en el backend; la tabla se refresca con la respuesta.
- **Reportes**: los 5 filtros de periodo (`daily`/`weekly`/`monthly`/
  `quarterly`/`annual`) llaman `GET /reports/summary?period=...`. La barra de
  meta usa `salesGoal` de Configuración.
- **Asistente IA**: **no llama a un LLM** — consume `GET /ai-analytics`, que
  es un motor de reglas sobre tus propios datos (ver la nota en el README del
  backend). Se muestra así en pantalla para que quede claro.

### Pago con tarjeta híbrido

`CardPaymentModal` ahora lee `settings.integratedTerminalEnabled`:

- **Activada**: simula la conexión con la terminal (~1.8s) y aprueba sola,
  generando una referencia simulada (`cardPaymentType: "INTEGRATED"`).
- **Desactivada**: salta directo a un formulario que exige el número de
  autorización/voucher de una terminal física independiente
  (`cardPaymentType: "MANUAL"`), ya que en ese caso el sistema no tiene forma
  de confirmar el pago por sí mismo.

Este switch se configura en `/settings`.

## Flujo del punto de venta

1. El cajero escanea o busca un producto en `ProductSearch` (debounce al
   escribir; si el lector de código de barras envía un SKU exacto + Enter,
   se agrega directo sin esperar la respuesta del debounce).
2. El producto se agrega a `CartTable`, donde se puede ajustar cantidad
   (respetando el stock disponible) o eliminar la línea.
3. `SaleSummary` recalcula subtotal, impuesto (16% por defecto, ajustable en
   `POSPage.tsx` vía la constante `TAX_RATE`) y total en tiempo real.
4. En `PaymentPanel` se elige Efectivo o Tarjeta. Si es efectivo, se captura
   el monto recibido y se calcula el cambio; el botón **Cobrar** se
   deshabilita si el efectivo no cubre el total.
5. Al cobrar, se llama a `POST /sales` con `{ paymentMethod, taxRate, items }`.
   El backend descuenta el stock y crea el ticket en una transacción atómica
   (ver `sale.service.ts` del backend). Se muestra un modal de confirmación
   con el folio generado y se limpia la venta para el siguiente cliente.

## Autenticación

El token JWT se guarda en `localStorage` (`pos_token`) y se adjunta
automáticamente a cada request vía el interceptor en `api/client.ts`. Si el
backend responde `401` (token vencido o inválido), se limpia la sesión y se
redirige a `/login` automáticamente.

## Scripts

| Script          | Descripción                          |
|------------------|----------------------------------------|
| `npm run dev`    | Servidor de desarrollo con HMR         |
| `npm run build`  | Type-check + build de producción       |
| `npm run preview`| Sirve el build de producción localmente|
| `npm run lint`   | Linting                                |
