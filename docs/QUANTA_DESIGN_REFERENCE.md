# Quanta Platform — Design & Architecture Reference

> Generated from repository analysis. Every example references a real file path.
> Use this document to build the **GFG Hotel Audits** module in full visual
> and architectural consistency with the rest of the platform.

---

## 1. SISTEMA DE DISENO

### 1.1 Paleta de colores

Definida en `src/app/globals.css` (`:root`, lineas 3-20):

| Token | Hex | Uso |
|---|---|---|
| `--primary` | `#172951` | Navy oscuro — color de marca, texto principal, headers |
| `--accent` | `#00AFAD` | Teal — acciones interactivas, focus rings, badges activos |
| `--accent-light` | `#69D9D0` | Teal claro — acentos secundarios |
| `--background` | `#FAFAFA` | Fondo de pagina |
| `--card` | `#FFFFFF` | Superficies de tarjetas |
| `--text-primary` | `#172951` | Texto principal (igual que --primary) |
| `--text-secondary` | `#6B7280` | Texto secundario (gray-500) |
| `--text-muted` | `#9CA3AF` | Texto apagado (gray-400) |
| `--border` | `#E5E5E5` | Borde default |
| `--border-light` | `#EBEBEB` | Borde mas suave (tablas internas) |
| `--muted` | `#F5F5F5` | Fondo muted (subtotal rows, strips) |
| `--bg-hover` | `#F3F4F6` | Hover en filas de tablas |
| `--success` | `#10B981` | Verde (emerald-500) — varianza positiva |
| `--danger` | `#EF4444` | Rojo (red-500) — varianza negativa |
| `--warning` | `#F59E0B` | Ambar (amber-500) |
| `--info` | `#0EA5E9` | Azul cielo (sky-500) |
| `--foreground` | `#172951` | Body text |

**Pill backgrounds para varianzas** (`src/app/dashboard/pnl/statement/tableConfig.ts`, lineas ~380-390):

| Token | Hex | Uso |
|---|---|---|
| `BG_GOOD` | `rgba(16,185,129,0.10)` | Fondo de pill positiva |
| `BG_BAD` | `rgba(239,68,68,0.10)` | Fondo de pill negativa |

**No hay dark mode.** No existe `.dark`, `prefers-color-scheme`, ni override alguno.

### 1.2 Variables CSS → Tailwind bridge

Tailwind v4 con `@theme inline` en `globals.css` (lineas 23-40). Cada variable `:root` se mapea a `--color-*` para que utilidades como `bg-primary`, `text-accent`, `border-border` funcionen.

```css
@theme inline {
  --color-primary: var(--primary);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-danger: var(--danger);
  /* ... completo en globals.css */
}
```

**No existe `tailwind.config.ts`.** Toda la customizacion es via el bloque `@theme inline`.

### 1.3 Tipografia

**Familia:** Inter (Google Fonts, variable weight) — `src/app/layout.tsx` linea 2, `src/app/globals.css` linea 45.

```css
font-family: 'Inter Variable', sans-serif;
```

**Tamanos mas usados** (dominan los valores arbitrarios en rem):

| Clase | px aprox | Uso tipico |
|---|---|---|
| `text-[0.6875rem]` | 11px | Headers de tabla, labels uppercase, tracking wider |
| `text-[0.75rem]` | 12px | Cuerpo de tabla, botones de layer toggle |
| `text-[0.8125rem]` | 13px | Inputs, selects, cuerpo de datos — **mas comun** |
| `text-[0.9375rem]` | 15px | Valores KPI en modo compacto |
| `text-sm` (preset) | 14px | Textos generales, mobile text |
| `text-xs` (preset) | 12px | Breadcrumbs mobile, annotations |
| `text-base` (preset) | 16px | Titulos de tarjeta |
| `text-xl` | 20px | Valores KPI grandes |
| `text-2xl` | 24px | Titulos de pagina |

**Pesos:**

| Clase | Ocurrencias | Uso |
|---|---|---|
| `font-semibold` | ~120 | **Dominante** — headers, labels, badges |
| `font-bold` | ~58 | Subtotales, titulos, filas destacadas |
| `font-medium` | ~42 | Toggle activos, texto de filtros |
| `font-normal` | ~17 | Cuerpo de tabla regular |

### 1.4 Espaciado

**Padding horizontal mas comun:** `px-3` (12px), `px-3.5` (14px), `px-2` (8px)
**Padding vertical mas comun:** `py-2` (8px), `py-1.5` (6px), `py-3` (12px)
**Padding de contenedor:** `p-6` (24px) — usado en `dashboard/layout.tsx` linea 12
**Gap dominante:** `gap-3` (12px), `gap-2` (8px), `gap-4` (16px)

### 1.5 Border radius

| Clase | px | Uso |
|---|---|---|
| `rounded-md` | 6px | **Dominante** — inputs, selects, botones, badges |
| `rounded-lg` | 8px | Cards, contenedores, tablas |
| `rounded-full` | 50% | Pills, avatares |
| `rounded-sm` | 2px | Variance pills en celdas de tabla |
| `rounded-xl` | 12px | Modales, contenedores de charts |

### 1.6 Shadows

| Clase | Uso |
|---|---|
| `shadow-sm` | **Dominante** — tabs activos, toggle seleccionados, cards base |
| `shadow-lg` | Dropdowns, overlays |
| `shadow-md` | Cards con mas prominencia, hover de KPI cards |
| Sin shadow | La mayoria de componentes solo usan `border` sin sombra |

### 1.7 Breakpoints

| Breakpoint | px | Uso |
|---|---|---|
| `sm:` | 640px | Search bar en header (visibility) |
| `md:` | 768px | **Principal** — sidebar/mobile split, `useIsMobile()` threshold |
| `lg:` | 1024px | Grid de 4 columnas en KPIs |
| `max-[1100px]:` | 1100px | KPI grid fallback a 2 columnas |

**`useIsMobile()`** (`src/lib/useIsMobile.ts`): Hook SSR-safe con `matchMedia` a 768px. Retorna `null` durante SSR, luego `true`/`false`.

---

## 2. COMPONENTES UI INSTALADOS Y SU USO

### 2.1 shadcn/ui

**No esta instalado.** No existe `components.json`. Los componentes en `src/components/ui/` son custom, escritos a mano.

### 2.2 Componentes compartidos (`src/components/ui/`)

#### KpiCard (`src/components/ui/KpiCard.tsx`)

Tarjeta de KPI con label, valor formateado, subtitulo opcional, color de acento en borde inferior.

```tsx
// Props: label, value, sub?, color?, accent?, subColor?, compact?
<KpiCard
  label="Total Revenue"
  value="$12.5M"
  sub="+8.2% vs LY"
  subColor="var(--success)"
  accent="var(--accent)"
/>
```

**Usado en:** `expenses/page.tsx`, `ops-radar/`, `action-plan-tracker/`, `airport-passengers/page.tsx`, `dashboard/page.tsx`.

#### MultiSelect (`src/components/ui/MultiSelect.tsx`)

Dropdown con checkboxes, "Select all / Clear all", click-outside-to-close. Tipado para `string[]`.

```tsx
<MultiSelect
  options={hotelOptions}
  selected={portfolioHotels}
  onChange={setPortfolioHotels}
  width="14rem"
  noun="hotels"
  compact
/>
```

**Usado en:** `pnl/statement/`, `expenses/page.tsx`. Re-exportado desde `src/app/dashboard/pnl/statement/ui.tsx`.

### 2.3 Componentes de layout (`src/components/layout/`)

| Componente | Archivo | Descripcion |
|---|---|---|
| `Header` | `src/components/layout/Header.tsx` | Header fijo (h-32), logo Quanta, search, user avatar + sign out |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Sidebar colapsable, categorias de menu, mobile drawer |

### 2.4 Otros componentes compartidos

| Componente | Archivo | Descripcion |
|---|---|---|
| `SessionProvider` | `src/components/providers/SessionProvider.tsx` | Wrapper de NextAuth SessionProvider |
| `PowerBIEmbed` | `src/components/powerbi/PowerBIEmbed.tsx` | Iframe Power BI con retry, filtros, spinner |
| `DashboardPlaceholder` | `src/components/powerbi/DashboardPlaceholder.tsx` | Pagina stub "coming soon" para dashboards no conectados |

### 2.5 Componentes locales por modulo (pattern de `ui.tsx`)

Cada modulo complejo define sus propios componentes UI pequenos en un archivo `ui.tsx` local:

- `src/app/dashboard/pnl/statement/ui.tsx` → `VariancePill`, `FormulaInfo`, `LegendDot`, `formatAxis`
- `src/app/dashboard/strategic/action-plan-tracker/ui.tsx` → Modal/Dialog local con `X` icon

### 2.6 Iconos Lucide React en uso (30 unicos)

**Navegacion:** `Home`, `ChevronRight`, `ChevronLeft`, `ChevronDown`, `Menu`, `X`, `Search`, `LogOut`
**Sidebar categorias:** `DollarSign`, `FileText`, `Hotel`, `Users`, `Wrench`, `BarChart3`, `TrendingUp`, `Sparkles`, `Star`, `Target`, `Radar`, `PlaneTakeoff`
**Acciones:** `Download`, `Eye`, `RefreshCw`, `Maximize2`, `ListFilter`, `SlidersHorizontal`, `Check`
**Data/info:** `Info`, `TrendingDown`, `GitBranch`, `Layers`, `Mail`
**Aliases:** `ChevronRight` como `ChevronRightIcon` en `StatementTable.tsx`, `Table` como `TableIcon`

### 2.7 Utilidades compartidas (`src/lib/`)

| Archivo | Export | Descripcion |
|---|---|---|
| `selectStyle.ts` | `selectStyle` | Estilo inline para `<select>` con borde y chevron SVG custom |
| `useIsMobile.ts` | `useIsMobile()` | Hook SSR-safe de deteccion de viewport (768px) |
| `db.ts` | `pool` | Singleton de Pool de PostgreSQL |
| `auth.ts` | `authOptions` | Config de NextAuth con Azure AD |
| `powerbi-config.ts` | `REPORTS`, etc. | IDs de workspaces/reports Power BI |

---

## 3. PATRONES DE LAYOUT

### 3.1 Estructura del dashboard shell

Definida en `src/app/dashboard/layout.tsx`:

```
+------------------------------------------------------+
| Header (fixed, h-32, z-50)                           |
+------------------------------------------------------+
| Sidebar    | Main content                            |
| (fixed,    | (md:ml-60, mt-32, p-6)                  |
| w-60,      |                                         |
| top-32)    |                                         |
+------------+-----------------------------------------+
```

### 3.2 Menu lateral — como agregar una nueva seccion

Editar el array `menuItems` en `src/components/layout/Sidebar.tsx`:

```ts
// Tipos del menu:
interface MenuItem { label: string; icon: LucideIcon; href: string; }
interface MenuCategory { category: string; items: MenuItem[]; }

// Ejemplo para agregar GFG Hotel Audits:
{ category: 'OPERATIONS', items: [
  { label: 'GFG Hotel Audits', icon: ClipboardCheck, href: '/dashboard/operations/hotel-audits' },
]}
```

**Categorias actuales:** Home (top-level), PROFIT & LOSS, TOP LINE, BOTTOM LINE, GUEST EXPERIENCE, STRATEGY & PLANNING, MARKET TRENDS.

**Estado activo:** `pathname === item.href` → `text-[var(--primary)] bg-[#F0FFFE] border-l-[3px] border-[var(--accent)]`

### 3.3 Breadcrumbs

**No es un componente compartido** — se construye inline en cada pagina. Pattern:

```tsx
// Desktop (3 niveles, text-sm)
<div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
  <span className="hover:underline cursor-pointer">Dashboard</span>
  <ChevronRight size={14} />
  <span className="hover:underline cursor-pointer">Operations</span>
  <ChevronRight size={14} />
  <span style={{ color: 'var(--primary)' }}>GFG Hotel Audits</span>
</div>

// Mobile (2 niveles, text-xs, ChevronRight size={12})
```

**Nota:** Los breadcrumbs actuales no usan `<Link>` — los spans tienen `hover:underline cursor-pointer` pero no navegan.

Encontrado en: `StatementDesktop.tsx:48`, `ActionPlanTrackerDesktop.tsx:77`, `DashboardPlaceholder.tsx:14`.

### 3.4 Patron de pagina (3 arquetipos)

**A) Paginas ricas (Desktop/Mobile split)** — el patron principal:

```tsx
// page.tsx — router thin
'use client';
import { useIsMobile } from '@/lib/useIsMobile';
import PageDesktop from './PageDesktop';
import PageMobile from './PageMobile';

export default function Page() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }
  return isMobile ? <PageMobile /> : <PageDesktop />;
}
```

Ref: `src/app/dashboard/pnl/statement/page.tsx`

**B) Paginas PowerBI embed:** `<PowerBIEmbed reportId="..." />`
**C) Paginas placeholder:** `<DashboardPlaceholder title="..." category="..." />`

### 3.5 Estructura interna de Desktop component

```
1. Breadcrumb
2. Titulo + subtitulo
3. (Opcional) View mode toggle
4. Filter bar: <select> con selectStyle + <MultiSelect>
5. KPI cards row: grid grid-cols-4 gap-3
6. Tabla/chart principal
7. Chart secundario (opcional)
```

Ref: `StatementDesktop.tsx`, `ActionPlanTrackerDesktop.tsx`, `airport-passengers/page.tsx`

### 3.6 Pattern de select/filtros

```tsx
import { selectStyle } from '@/lib/selectStyle';

<select
  className="h-9 w-28 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white
             appearance-none cursor-pointer transition-colors outline-none truncate
             focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
  style={selectStyle}
  value={year}
  onChange={(e) => setYear(Number(e.target.value))}
>
  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
</select>
```

Ref: `StatementDesktop.tsx` lineas ~90-110

---

## 4. PATRONES DE FORMULARIOS

**No encontrado en el repo — decision pendiente.**

- No se usa `react-hook-form` ni `Zod` en ningun lugar del codebase.
- Todos los inputs son `<select>` y `<input>` nativos con `useState`.
- No hay formularios de creacion/edicion — solo filtros de lectura.
- No hay patrones de validacion, mensajes de error de campo, ni estados de submit.

**Para GFG Hotel Audits se debera definir:** libreria de forms (react-hook-form + Zod recomendado), patterns de validacion, error display, y submit states.

---

## 5. PATRONES DE DATA FETCHING Y ESTADO

### 5.1 No hay TanStack Query ni SWR

Data fetching es `fetch()` en `useEffect` con `AbortController`:

```ts
// src/app/dashboard/pnl/statement/useStatement.ts
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);
  (async () => {
    try {
      const res = await fetch(`/api/aag/forecast-rows?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) { setForecastRows([]); setLoading(false); return; }
      const data: ForecastRow[] = await res.json();
      if (!controller.signal.aborted) {
        setForecastRows(data);
        setLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) { setForecastRows([]); setLoading(false); }
    }
  })();
  return () => controller.abort();
}, [year, currency]);
```

### 5.2 Custom hooks (patron de estado por modulo)

Cada modulo tiene un hook `use*.ts` que centraliza **todo** el state:

| Hook | Archivo | Responsabilidad |
|---|---|---|
| `useStatement()` | `pnl/statement/useStatement.ts` | Fetch de rows, filtros, derived data, portfolio |
| `useActionPlan()` | `action-plan-tracker/useActionPlan.ts` | Filtros sobre datos hardcoded |
| `useOpsRadar()` | `ops-radar/useOpsRadar.ts` | Filtros sobre datos hardcoded |

### 5.3 Loading states

**No hay componente Skeleton.** Skeletons son divs con `animate-pulse`:

```tsx
// src/app/dashboard/pnl/statement/page.tsx
<div className="animate-pulse flex flex-col gap-4">
  <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
  <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
  <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
</div>
```

**Spinner** (solo en PowerBI embed):
```tsx
<div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
```

### 5.4 Empty states

No hay un componente de empty state. Los patterns son:
- Retornar arrays vacios y mostrar `"—"` o `"N/A"` en los valores
- Fallback a datos estaticos cuando el fetch falla
- `src/app/dashboard/pnl/statement/StatementDesktop.tsx`: "Select at least one hotel to build the portfolio view."

### 5.5 Error handling / notificaciones

**No hay libreria de toasts/notificaciones instalada.** No `react-hot-toast`, no `sonner`.

- Server-side: `console.error()` + JSON `{ error: "..." }` con status 500
- Client-side: Errores se silencian en `catch` blocks que resetean estado a defaults
- Unica UI de error visible: `PowerBIEmbed.tsx` muestra mensaje rojo + boton "Retry" tras 3 intentos fallidos

---

## 6. ARQUITECTURA DE RUTAS Y API

### 6.1 Estructura de carpetas (`src/app/dashboard/`)

```
dashboard/
  layout.tsx          ← shell (Header + Sidebar + main)
  page.tsx            ← Home dashboard
  bottomline/
    expenses/page.tsx
    projects/page.tsx
    staffing/page.tsx
    utilities/page.tsx
  guest/
    digital-presence-snapshot/page.tsx
    meta-positioning/page.tsx
    ops-radar/
      page.tsx, OpsRadarDesktop.tsx, OpsRadarMobile.tsx, useOpsRadar.ts, data.ts
    satisfaction/page.tsx
  market/
    airport-passengers/
      page.tsx, data.ts
    market-demand/page.tsx
  pnl/
    statement/
      page.tsx, StatementDesktop.tsx, StatementMobile.tsx, useStatement.ts,
      data.ts, tableConfig.ts, ui.tsx, layerHelpers.tsx,
      StatementTable.tsx, StatementSummaryTable.tsx, StatementMonthlyTable.tsx,
      StatementYearlyTable.tsx, StatementPortfolioTable.tsx
  strategic/
    action-plan-tracker/
      page.tsx, ActionPlanTrackerDesktop.tsx, ActionPlanTrackerMobile.tsx,
      useActionPlan.ts, data.ts, ui.tsx
    forecast/page.tsx
  topline/
    market-share/page.tsx
    on-the-books/page.tsx
    other-rev/page.tsx
    rooms-rev/page.tsx
```

### 6.2 API Routes (`src/app/api/`)

| Ruta | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | — | Handler de NextAuth (Azure AD) |
| `/api/aag/dimensions` | GET | Si | Retorna anos y hoteles distintos de Postgres |
| `/api/aag/forecast-rows` | GET | Si | Retorna filas P&L con toggle de moneda |
| `/api/kpis` | GET | **No** | KPIs via DAX query a Power BI |
| `/api/powerbi` | GET | Si | Genera embed tokens Power BI |

### 6.3 Patron de API Route

```ts
// src/app/api/aag/forecast-rows/route.ts
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // 2. Parse + validate params
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    if (!yearParam)
      return NextResponse.json({ error: "year is required" }, { status: 400 });

    // 3. Parameterized query
    const result = await pool.query(SQL_YEAR, [year, currencyParam]);

    // 4. Transform + respond
    const rows: ForecastRow[] = result.rows.map((r) => ({ ... }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error("forecast-rows error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 6.4 Naming de endpoints

Pattern: `/api/<dominio>/<recurso>` — ejemplos: `/api/aag/dimensions`, `/api/aag/forecast-rows`.

---

## 7. INTEGRACION CON POSTGRESQL

### 7.1 Conexion

**Driver:** `pg` (v8.20.0) — pool singleton en `src/lib/db.ts`:

```ts
import { Pool } from "pg";
const globalForPg = globalThis as unknown as { pgPool?: Pool };
export const pool = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 5,
  statement_timeout: 10_000,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
```

### 7.2 Prisma

**No se usa.** No existe `prisma/schema.prisma` ni imports de `@prisma/client`. Todo es SQL crudo via `pool.query()`.

### 7.3 Patron de queries

SQL como template strings constantes al tope del archivo, parametrizadas con `$1`, `$2`:

```ts
const SQL_YEAR = `
  WITH ultimos_snapshots AS (
    SELECT hotel, data_type, year_num, MAX(week) AS max_week
    FROM at_a_glance.aag
    GROUP BY hotel, data_type, year_num
  )
  SELECT ...
  FROM at_a_glance.aag a
  JOIN ultimos_snapshots us ON ...
  WHERE a.year_num = $1
  ORDER BY ...
`;
const result = await pool.query(SQL_YEAR, [year, currencyParam]);
```

### 7.4 Naming de tablas/columnas

- **Schema:** `at_a_glance` (schema dedicado)
- **Tabla:** `aag` (nombre corto del dominio)
- **Columnas:** `snake_case` — `year_num`, `month_name`, `data_type`, `rooms_sold`, `rooms_revenue_nc`, etc.
- **NUMERIC:** Retornado como `string` por pg; cada endpoint parsea con `Number(v)`.

### 7.5 Migraciones

**No encontrado en el repo — decision pendiente.** No hay directorio de migraciones, ni scripts SQL versionados, ni herramientas como Flyway/dbmate. Las tablas se asumen pre-existentes en Azure Postgres.

---

## 8. AUTENTICACION Y PERMISOS

### 8.1 NextAuth + Azure AD

Configurado en `src/lib/auth.ts`:

- Provider: `AzureADProvider` con `AUTH_AZURE_AD_CLIENT_ID`, `AUTH_AZURE_AD_CLIENT_SECRET`, `AUTH_AZURE_AD_TENANT_ID`
- Strategy: JWT (no sessions DB)
- Sign-in page: `/login`
- Cookies: HTTPS-aware con prefijos `__Secure-` / `__Host-`

### 8.2 Proteccion de rutas

**Middleware** (`src/middleware.ts`): Protege `/dashboard/:path*`. Redirige a `/login` con `callbackUrl`.

**API routes:** Cada una valida `getServerSession(authOptions)` individualmente (excepto `/api/kpis` que no verifica auth).

### 8.3 Acceso a session

| Contexto | Metodo | Ejemplo |
|---|---|---|
| Server (API routes) | `getServerSession(authOptions)` | `api/aag/dimensions/route.ts` |
| Client components | `useSession()` | `Header.tsx` — nombre y email del usuario |

### 8.4 Roles / permisos

**No existe un sistema RBAC.** El unico concepto de "rol" es para Power BI RLS (Row-Level Security): `getRoleFromEmail()` mapea el prefijo del email a un brand de hotel (`BBG`, `GFGAM`, etc.) para filtrar datos en el embed.

---

## 9. CONVENCIONES DE CODIGO

### 9.1 Estructura de carpetas por modulo

```
src/app/dashboard/<categoria>/<modulo>/
  page.tsx                  ← Entry point, useIsMobile() switch
  <Modulo>Desktop.tsx       ← PascalCase, layout desktop
  <Modulo>Mobile.tsx        ← PascalCase, layout mobile
  use<Modulo>.ts            ← camelCase, custom hook con todo el estado
  data.ts                   ← Tipos, constantes, formatters, datos mock
  ui.tsx                    ← Componentes UI pequenos del modulo
  tableConfig.ts            ← (Opcional) config de filas de tabla
  layerHelpers.tsx          ← (Opcional) helpers compartidos de capa
```

### 9.2 Naming

| Concepto | Convencion | Ejemplo |
|---|---|---|
| Componentes de pagina | PascalCase | `StatementDesktop.tsx` |
| Hooks custom | camelCase con `use` | `useStatement.ts` |
| Archivos data/config | camelCase | `data.ts`, `tableConfig.ts` |
| UI fragments | `ui.tsx` (lowercase) | Co-locado en el modulo |
| API routes | `route.ts` | `api/aag/dimensions/route.ts` |
| Lib utilities | camelCase | `auth.ts`, `db.ts`, `selectStyle.ts` |
| Tipos TS | Co-locados en `data.ts` | No hay carpeta `types/` |

### 9.3 Patron de imports

```ts
// 1. React / framework imports
import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

// 2. Shared libs via alias @/
import { selectStyle } from '@/lib/selectStyle';
import KpiCard from '@/components/ui/KpiCard';

// 3. Relative module imports
import { useStatement, type ViewMode } from './useStatement';
import { MONTHS, type ForecastRow } from './data';
```

### 9.4 Exports

- `export default function` para page components y componentes principales
- `export function` (named) para utilidades, tipos, componentes secundarios
- `export type` para tipos TS

---

## 10. INSUMOS PARA GFG HOTEL AUDITS

### 10.1 Ubicacion recomendada

```
src/app/dashboard/operations/hotel-audits/
  page.tsx
  HotelAuditsDesktop.tsx
  HotelAuditsMobile.tsx
  useHotelAudits.ts
  data.ts                    ← tipos (Audit, AuditItem, etc.), constantes
  ui.tsx                     ← componentes UI locales del modulo
```

**Sidebar entry** a agregar en `src/components/layout/Sidebar.tsx`:

```ts
{ category: 'OPERATIONS', items: [
  { label: 'GFG Hotel Audits', icon: ClipboardCheck, href: '/dashboard/operations/hotel-audits' },
]}
```

**API routes:**

```
src/app/api/audits/
  route.ts                   ← GET (listar auditorias), POST (crear auditoria)
  [id]/route.ts              ← GET (detalle), PUT (actualizar), DELETE
  [id]/items/route.ts        ← GET/POST items de auditoria
  [id]/photos/route.ts       ← POST (upload de fotos)
  [id]/signature/route.ts    ← POST (firma digital)
```

### 10.2 Componentes existentes a reutilizar

| Componente | Para que |
|---|---|
| `KpiCard` | KPIs resumen (auditorias completadas, score promedio, pendientes) |
| `MultiSelect` | Filtro de hoteles, filtro de areas auditadas |
| `selectStyle` | Todos los `<select>` nativos (filtro de periodo, estado, tipo) |
| `useIsMobile()` | Split Desktop/Mobile en `page.tsx` |
| `pool` de `db.ts` | Conexion a Postgres para API routes |
| `getServerSession(authOptions)` | Auth en cada API route |
| `VariancePill` (de `pnl/statement/ui.tsx`) | Si hay scores con variance vs target, reutilizar el pill |

### 10.3 Patrones obligatorios para consistencia

1. **Styling:** Solo Tailwind classes + `var(--*)` CSS variables. No CSS Modules, no styled-components, no inline `<style>`.
2. **Nombres:** Variables, tipos y funciones en ingles. Contenido de negocio puede ser en espanol.
3. **Layout:** `page.tsx` → `useIsMobile()` → Desktop/Mobile split con skeleton durante SSR.
4. **Breadcrumbs:** Inline con `ChevronRight`, 3 niveles desktop, 2 mobile.
5. **Filtros:** `<select>` con `selectStyle`, `<MultiSelect>` para multi-seleccion.
6. **Data fetching:** `fetch()` en `useEffect` con `AbortController` dentro de un hook `useHotelAudits.ts`.
7. **API routes:** `getServerSession` auth check, parametrized SQL, try/catch con 500 fallback, `export const dynamic = "force-dynamic"`.
8. **Tipos:** Co-locados en `data.ts`, no en carpeta separada. No Zod (todavia).
9. **Icons:** Lucide React exclusivamente.
10. **Colores semanticos:** `var(--success)` para positivo, `var(--danger)` para negativo, `var(--warning)` para advertencias.

### 10.4 Decisiones nuevas necesarias (no cubiertas por patrones actuales)

| Tema | Situacion actual | Decision necesaria |
|---|---|---|
| **Formularios** | No hay forms en el repo (solo filtros read-only) | Definir: react-hook-form + Zod? Patron de validacion, error display, submit states |
| **Subida de fotos** | No hay uploads en el repo | Storage (Azure Blob? S3?), patron de upload, preview, compresion client-side |
| **Captura de firma digital** | No existe precedente | Libreria de canvas (react-signature-canvas?), storage como imagen, vinculacion al audit |
| **Toasts / notificaciones** | No hay libreria instalada | Instalar sonner o react-hot-toast para feedback de acciones CRUD |
| **Confirmacion destructiva** | No hay modales/dialogs compartidos | Componente de dialogo de confirmacion (o instalar Dialog de Radix) |
| **Paginacion** | No existe — todas las tablas muestran todo | Paginacion server-side para lista de auditorias si escala |
| **Offline / PWA** | No hay soporte offline | Auditorias de campo pueden requerir offline-first — decision critica |
| **Roles / permisos** | Solo RLS de Power BI, sin RBAC app | Quien puede crear/ver/aprobar auditorias? Necesita RBAC? |
| **PDF export** | `jspdf` recien agregado en action-plan-tracker | Reutilizar patron de `html-to-image` + `jspdf` para exportar auditorias |
| **Migraciones de BD** | No hay sistema de migraciones | Schema para `audits`, `audit_items`, `audit_photos` — como se versiona? |
| **Tabs / stepper** | No existe componente de tabs compartido | Auditorias largas pueden necesitar steps/secciones — definir UX |
| **Data tables** | Las tablas actuales son custom JSX, no un componente generico | Evaluar si necesita sorting, filtering, column resize — o si basta custom JSX |
| **Estado de auditoria** | No hay precedente de workflows | Draft → In Progress → Completed → Approved? State machine? |
| **Real-time** | No hay WebSockets ni SSE | Auditorias concurrentes? Necesitan real-time sync? |

---

## PREGUNTAS ABIERTAS

1. **Donde se almacenan las fotos?** Azure Blob Storage? Postgres bytea? Filesystem? Cual es el presupuesto de storage?

2. **La firma digital tiene validez legal?** Es solo una imagen de referencia o necesita certificacion digital?

3. **Se necesita modo offline?** Los auditores de campo pueden estar sin conexion dentro del hotel?

4. **Quien puede crear vs aprobar una auditoria?** Necesitamos un sistema de roles (Auditor, Manager, Admin)?

5. **Cual es el flujo de estados de una auditoria?** Draft → In Progress → Review → Approved → Archived?

6. **Se necesita versionado de auditorias?** Poder ver el historial de cambios de un audit item?

7. **Que schema de Postgres se usara?** Crear `hotel_audits.audits`, `hotel_audits.audit_items`, etc.? Seguir el patron `at_a_glance` con un schema dedicado?

8. **Como se manejan las migraciones?** Adoptar dbmate / Flyway / SQL scripts versionados?

9. **Instalar react-hook-form + Zod?** Es la recomendacion natural, pero rompe el patron actual de "solo useState". Confirmar.

10. **Instalar una libreria de notificaciones?** `sonner` es liviana y compatible con App Router. Confirmar antes de instalar.

11. **El modulo necesita un sub-menu en el sidebar?** Hotel Audits podria tener sub-paginas (Lista, Crear, Templates). Todas bajo un solo sidebar item o expandir con sub-items?

12. **Hay un scoring system definido?** Pesos por area, escala (1-5? percentage?), como se calcula el score final?

13. **Se necesita exportar a PDF?** Reutilizar el patron `jspdf` + `html-to-image` del Action Plan Tracker?

14. **Los filtros de la lista de auditorias son solo client-side o necesitan server-side?** Depende del volumen de datos esperado.

15. **Que iconos usar para el modulo?** Sugerencia: `ClipboardCheck` para sidebar, `Camera` para fotos, `PenTool` para firma, `CheckCircle` / `AlertCircle` para estados.
