# 中国库存系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared Excel inventory sheet with a web app (Supabase + Cloudflare Pages) that 3-4 people can use concurrently from desktop (data entry) and mobile (viewing), with per-product stock tracking, an all-transactions ledger, and Excel export.

**Architecture:** React + TypeScript SPA (Vite) deployed as static files on Cloudflare Pages. No custom backend — the browser talks directly to Supabase (Postgres + Auth + Realtime) via `@supabase/supabase-js`. Current stock is computed by a Postgres view (`opening_stock + inbound - outbound`), never stored redundantly. All 4 user accounts share identical permissions (no role tiers).

**Tech Stack:** React 18, TypeScript, Vite, React Router, Tailwind CSS, `@supabase/supabase-js`, `xlsx` (SheetJS) for Excel export/import, Vitest + Testing Library for tests, Supabase (Postgres/Auth/Realtime), Cloudflare Pages.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-inventory-system-design.md` — every task below implements a section of it.
- No public signup — exactly 4 Supabase Auth accounts, created manually in the Supabase dashboard, all with identical permissions.
- `transactions.type` is exactly one of `inbound` (入库) / `outbound` (出库) / `order` (订单); `order` never affects stock.
- Current stock is always `opening_stock + SUM(inbound) - SUM(outbound)` computed via the `products_with_stock` view — never write a duplicate stored "current stock" column.
- Historical per-batch transaction rows from the old Excel are **not** migrated — only product master data + a single `opening_stock` snapshot per product.
- Exchange rate is a single manually-edited global value (`exchange_rate` table, one row). Editing it must never retroactively change already-saved `price_jpy`/`price_rmb` values on existing products.
- UI copy is Chinese, sentence-style (matches the approved mockups), not English.
- Free tier only: Supabase free project, Cloudflare Pages free tier. No paid services.

---

## File Structure

```
中国库存系统/
  index.html
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  .env.example
  .env                          (gitignored)
  .gitignore
  supabase/
    schema.sql                  # full DB schema, run once in Supabase SQL editor
  scripts/
    migrate-products.mjs        # one-off import from the old Excel file
  src/
    main.tsx
    App.tsx
    index.css                   # Tailwind entrypoint
    types/
      database.ts               # Product, Transaction, ExchangeRate types
    lib/
      supabaseClient.ts
      currency.ts                (+ currency.test.ts)
      inventory.ts                (+ inventory.test.ts)
      exportExcel.ts              (+ exportExcel.test.ts)
      useRealtimeTable.ts
    features/
      auth/
        AuthContext.tsx
        LoginPage.tsx
        ProtectedRoute.tsx
      products/
        useProducts.ts
        useProduct.ts
        ProductListPage.tsx
        ProductForm.tsx
        ProductDetailPage.tsx
      transactions/
        useTransactions.ts
        TransactionForm.tsx
        LedgerPage.tsx
      settings/
        useExchangeRate.ts
        ExchangeRateBadge.tsx
  docs/superpowers/
    specs/2026-08-11-inventory-system-design.md
    plans/2026-08-11-inventory-system.md
```

---

### Task 1: Project scaffold (Vite + React + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/App.test.tsx`

**Interfaces:**
- Produces: a running `npm run dev` app, `npm test` (Vitest), `npm run build` producing `dist/`.

- [ ] **Step 1: Scaffold the Vite project**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the current directory not being empty, choose to continue (the `docs/` folder already exists here).

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install react-router-dom @supabase/supabase-js xlsx
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Initialize Tailwind config**

```bash
npx tailwindcss init -p
```

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 4: Set up `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Wire Vitest into `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
```

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom';
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create `.env.example` and `.gitignore` entries**

`.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Add to `.gitignore`:

```
.env
node_modules
dist
```

- [ ] **Step 7: Write a minimal `src/App.tsx` and its test**

`src/App.tsx`:

```tsx
export default function App() {
  return <div className="p-4">中国库存系统</div>;
}
```

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app shell', () => {
  render(<App />);
  expect(screen.getByText('中国库存系统')).toBeInTheDocument();
});
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Run the test suite**

Run: `npm test`
Expected: `App.test.tsx` passes (1 test).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest project"
```

---

### Task 2: Supabase schema, RLS, and typed client

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/types/database.ts`
- Create: `src/lib/supabaseClient.ts`

**Interfaces:**
- Produces: `supabase` client instance (`src/lib/supabaseClient.ts`), and types `Product`, `ProductWithStock`, `Transaction`, `TransactionType`, `TransactionWithProduct`, `ExchangeRate` (`src/types/database.ts`) consumed by every later task.

- [ ] **Step 1: Write the schema file**

`supabase/schema.sql`:

```sql
-- Products (商品资料)
create table products (
  id bigint generated always as identity primary key,
  name_cn text not null,
  name_en text,
  material_cn text,
  material_jp text,
  sku text,
  box_qty numeric,
  ctn numeric,
  net_weight numeric,
  gross_weight numeric,
  length numeric,
  width numeric,
  height numeric,
  cbm numeric,
  price_jpy numeric,
  price_rmb numeric,
  reorder_point numeric,
  opening_stock numeric not null default 0,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions (出入库流水)
create type transaction_type as enum ('inbound', 'outbound', 'order');

create table transactions (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  type transaction_type not null,
  quantity numeric not null,
  date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Exchange rate (single-row settings table)
create table exchange_rate (
  id smallint primary key default 1,
  rmb_to_jpy numeric not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint exchange_rate_single_row check (id = 1)
);
insert into exchange_rate (id, rmb_to_jpy) values (1, 20.0);

-- Current-stock view: opening_stock + inbound - outbound, plus latest movement for the list page
create view products_with_stock
with (security_invoker = true) as
select
  p.*,
  p.opening_stock
    + coalesce(agg.inbound_total, 0)
    - coalesce(agg.outbound_total, 0) as current_stock,
  latest.date as latest_date,
  latest.type as latest_type,
  latest.quantity as latest_quantity
from products p
left join lateral (
  select
    sum(case when t.type = 'inbound' then t.quantity else 0 end) as inbound_total,
    sum(case when t.type = 'outbound' then t.quantity else 0 end) as outbound_total
  from transactions t
  where t.product_id = p.id
) agg on true
left join lateral (
  select t2.date, t2.type, t2.quantity
  from transactions t2
  where t2.product_id = p.id and t2.type in ('inbound', 'outbound')
  order by t2.date desc, t2.created_at desc
  limit 1
) latest on true;

-- Row Level Security: any authenticated user has full access, no anonymous access, no role tiers
alter table products enable row level security;
alter table transactions enable row level security;
alter table exchange_rate enable row level security;

create policy "authenticated full access" on products
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on transactions
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on exchange_rate
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply the schema in Supabase**

In the Supabase dashboard: create a new project (free tier) → SQL Editor → paste the full contents of `supabase/schema.sql` → Run. Verify in Table Editor that `products`, `transactions`, `exchange_rate` exist and `products_with_stock` appears under Views.

Create the 4 team accounts: Authentication → Users → Add user, for each of the 4 people (email + password, "Auto Confirm User" checked since there's no email flow set up).

- [ ] **Step 3: Copy Supabase credentials into `.env`**

In the Supabase dashboard: Project Settings → API. Copy "Project URL" and "anon public" key into `.env` (create it from `.env.example`):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 4: Write the shared TypeScript types**

`src/types/database.ts`:

```ts
export type TransactionType = 'inbound' | 'outbound' | 'order';

export interface Product {
  id: number;
  name_cn: string;
  name_en: string | null;
  material_cn: string | null;
  material_jp: string | null;
  sku: string | null;
  box_qty: number | null;
  ctn: number | null;
  net_weight: number | null;
  gross_weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  cbm: number | null;
  price_jpy: number | null;
  price_rmb: number | null;
  reorder_point: number | null;
  opening_stock: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  latest_date: string | null;
  latest_type: TransactionType | null;
  latest_quantity: number | null;
}

export interface Transaction {
  id: number;
  product_id: number;
  type: TransactionType;
  quantity: number;
  date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TransactionWithProduct extends Transaction {
  product: Pick<Product, 'id' | 'name_cn' | 'sku'>;
}

export interface ExchangeRate {
  id: number;
  rmb_to_jpy: number;
  updated_by: string | null;
  updated_at: string;
}

export type NewProduct = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'created_by'>;
```

- [ ] **Step 5: Write the Supabase client**

`src/lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase schema, RLS policies, and typed client"
```

---

### Task 3: Auth — login page, session context, protected routes

**Files:**
- Create: `src/features/auth/AuthContext.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/ProtectedRoute.tsx`
- Create: `src/features/auth/LoginPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.ts` (Task 2).
- Produces: `AuthProvider`, `useAuth(): { session: Session | null, loading: boolean }` (`src/features/auth/AuthContext.tsx`); `<ProtectedRoute>` wrapper component. Later tasks read `useAuth().session.user.id` for `created_by`/`updated_by` fields.

- [ ] **Step 1: Write `AuthContext`**

`src/features/auth/AuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Write `LoginPage`**

`src/features/auth/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError('登录失败，请检查邮箱和密码');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="mb-4 text-lg font-medium">登录中国库存系统</h1>
        <label className="mb-1 block text-sm text-gray-500">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm text-gray-500">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          登录
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Write `ProtectedRoute`**

`src/features/auth/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Write the login page test**

`src/features/auth/LoginPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import LoginPage from './LoginPage';

test('renders email and password fields', () => {
  render(<LoginPage />);
  expect(screen.getByText('邮箱')).toBeInTheDocument();
  expect(screen.getByText('密码')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: `LoginPage.test.tsx` passes.

- [ ] **Step 6: Wire routing into `App.tsx`**

`src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="p-4">中国库存系统</div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

Update `src/App.test.tsx` to wrap in the providers it now needs:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders login page when not authenticated', () => {
  render(<App />);
  expect(screen.getByText('登录中国库存系统')).toBeInTheDocument();
});
```

Remove the unused `MemoryRouter` import (App already renders its own `BrowserRouter`, so wrapping again would nest routers) — keep only the `render(<App />)` version above.

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: both test files pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Supabase auth (login page, session context, protected routes)"
```

---

### Task 4: Currency conversion and stock/low-stock pure logic (TDD)

**Files:**
- Create: `src/lib/currency.ts`, `src/lib/currency.test.ts`
- Create: `src/lib/inventory.ts`, `src/lib/inventory.test.ts`

**Interfaces:**
- Consumes: `ProductWithStock` type (Task 2).
- Produces: `jpyFromRmb(rmb, rmbToJpy): number`, `rmbFromJpy(jpy, rmbToJpy): number` (`src/lib/currency.ts`); `isLowStock(product): boolean`, `filterProducts(products, { search, lowStockOnly }): ProductWithStock[]` (`src/lib/inventory.ts`). Consumed by `ProductForm` (Task 6) and `ProductListPage` (Task 5).

- [ ] **Step 1: Write the failing currency tests**

`src/lib/currency.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { jpyFromRmb, rmbFromJpy } from './currency';

describe('jpyFromRmb', () => {
  test('converts RMB to JPY using the given rate', () => {
    expect(jpyFromRmb(12.1, 36.36)).toBeCloseTo(439.96, 1);
  });
});

describe('rmbFromJpy', () => {
  test('converts JPY to RMB using the given rate', () => {
    expect(rmbFromJpy(440, 36.36)).toBeCloseTo(12.1, 1);
  });

  test('returns 0 when the rate is 0 instead of dividing by zero', () => {
    expect(rmbFromJpy(440, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- currency`
Expected: FAIL — `currency.ts` does not exist yet.

- [ ] **Step 3: Implement `currency.ts`**

`src/lib/currency.ts`:

```ts
export function jpyFromRmb(rmb: number, rmbToJpy: number): number {
  return Math.round(rmb * rmbToJpy * 100) / 100;
}

export function rmbFromJpy(jpy: number, rmbToJpy: number): number {
  if (rmbToJpy === 0) return 0;
  return Math.round((jpy / rmbToJpy) * 100) / 100;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- currency`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing inventory tests**

`src/lib/inventory.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { isLowStock, filterProducts } from './inventory';
import type { ProductWithStock } from '../types/database';

function makeProduct(overrides: Partial<ProductWithStock> = {}): ProductWithStock {
  return {
    id: 1,
    name_cn: '示例商品 A',
    name_en: null,
    material_cn: null,
    material_jp: null,
    sku: 'sku-a',
    box_qty: null,
    ctn: null,
    net_weight: null,
    gross_weight: null,
    length: null,
    width: null,
    height: null,
    cbm: null,
    price_jpy: null,
    price_rmb: null,
    reorder_point: 100,
    opening_stock: 0,
    photo_url: null,
    created_at: '',
    updated_at: '',
    current_stock: 500,
    latest_date: null,
    latest_type: null,
    latest_quantity: null,
    ...overrides,
  };
}

describe('isLowStock', () => {
  test('true when current_stock is below reorder_point', () => {
    expect(isLowStock(makeProduct({ current_stock: 40, reorder_point: 100 }))).toBe(true);
  });

  test('false when current_stock is at or above reorder_point', () => {
    expect(isLowStock(makeProduct({ current_stock: 100, reorder_point: 100 }))).toBe(false);
  });

  test('false when reorder_point is not set', () => {
    expect(isLowStock(makeProduct({ current_stock: 0, reorder_point: null }))).toBe(false);
  });
});

describe('filterProducts', () => {
  const products = [
    makeProduct({ id: 1, name_cn: '示例商品 A', sku: 'tube-120P', current_stock: 40, reorder_point: 100 }),
    makeProduct({ id: 2, name_cn: '示例商品 B', sku: null, current_stock: 900, reorder_point: 100 }),
  ];

  test('search matches name_cn case-insensitively', () => {
    const result = filterProducts(products, { search: '商品 A', lowStockOnly: false });
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  test('search matches sku', () => {
    const result = filterProducts(products, { search: 'tube', lowStockOnly: false });
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  test('lowStockOnly filters to products under their reorder point', () => {
    const result = filterProducts(products, { search: '', lowStockOnly: true });
    expect(result.map((p) => p.id)).toEqual([1]);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- inventory`
Expected: FAIL — `inventory.ts` does not exist yet.

- [ ] **Step 7: Implement `inventory.ts`**

`src/lib/inventory.ts`:

```ts
import type { ProductWithStock } from '../types/database';

export function isLowStock(
  product: Pick<ProductWithStock, 'current_stock' | 'reorder_point'>
): boolean {
  if (product.reorder_point == null) return false;
  return product.current_stock < product.reorder_point;
}

export function filterProducts(
  products: ProductWithStock[],
  { search, lowStockOnly }: { search: string; lowStockOnly: boolean }
): ProductWithStock[] {
  const term = search.trim().toLowerCase();
  return products.filter((p) => {
    if (lowStockOnly && !isLowStock(p)) return false;
    if (!term) return true;
    return p.name_cn.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
  });
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- inventory`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add currency conversion and stock filtering logic"
```

---

### Task 5: Product list page

**Files:**
- Create: `src/lib/useRealtimeTable.ts`
- Create: `src/features/products/useProducts.ts`
- Create: `src/features/products/ProductListPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `ProductWithStock` type (Task 2), `filterProducts`/`isLowStock` (Task 4), `useAuth` (Task 3).
- Produces: `useRealtimeTable(table: string, onChange: () => void): void`; `useProducts(): { products: ProductWithStock[], loading: boolean, refetch: () => void }`, consumed by `ProductDetailPage` (Task 7) indirectly via the same pattern.

- [ ] **Step 1: Write the realtime subscription hook**

`src/lib/useRealtimeTable.ts`:

```ts
import { useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useRealtimeTable(table: string, onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
```

- [ ] **Step 2: Write `useProducts`**

`src/features/products/useProducts.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ProductWithStock } from '../../types/database';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('products_with_stock')
      .select('*')
      .order('name_cn', { ascending: true });
    if (!error && data) setProducts(data as ProductWithStock[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('products', refetch);
  useRealtimeTable('transactions', refetch);

  return { products, loading, refetch };
}
```

- [ ] **Step 3: Write `ProductListPage`**

`src/features/products/ProductListPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from './useProducts';
import { filterProducts, isLowStock } from '../../lib/inventory';
import { exportProductsToExcel } from '../../lib/exportExcel';

export default function ProductListPage() {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = useMemo(
    () => filterProducts(products, { search, lowStockOnly }),
    [products, search, lowStockOnly]
  );

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="搜索品名 / 品番"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-[2] rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={`rounded-md border px-3 py-2 text-sm ${
            lowStockOnly ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300 text-gray-700'
          }`}
        >
          仅看预警
        </button>
        <Link
          to="/products/new"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
        >
          + 新增商品
        </Link>
        <button
          onClick={() => exportProductsToExcel(filtered)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          导出 Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">编号</th>
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 font-medium">材质</th>
              <th className="px-2 py-2 text-right font-medium">日元单价</th>
              <th className="px-2 py-2 text-right font-medium">单价(RMB)</th>
              <th className="px-2 py-2 text-right font-medium">实时库存</th>
              <th className="px-2 py-2 font-medium">最近动向</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-gray-200 ${isLowStock(p) ? 'bg-red-50' : ''}`}
              >
                <td className="px-2 py-2 text-gray-400">
                  <Link to={`/products/${p.id}`} className="block">
                    {String(p.id).padStart(4, '0')}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <Link to={`/products/${p.id}`} className="block">
                    {p.name_cn}
                  </Link>
                </td>
                <td className="px-2 py-2 text-gray-400">{p.sku ?? '-'}</td>
                <td className="px-2 py-2">{p.material_cn ?? p.material_jp ?? '-'}</td>
                <td className="px-2 py-2 text-right">{p.price_jpy ?? '-'}</td>
                <td className="px-2 py-2 text-right">{p.price_rmb ?? '-'}</td>
                <td
                  className={`px-2 py-2 text-right ${
                    isLowStock(p) ? 'font-medium text-red-700' : ''
                  }`}
                >
                  {p.current_stock}
                </td>
                <td className="px-2 py-2 text-gray-500">
                  {p.latest_date
                    ? `${p.latest_date} ${p.latest_type === 'inbound' ? '入库' : '出库'} ${p.latest_quantity}`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

(`exportProductsToExcel` is implemented in Task 9 — this file compiles once that task lands; see Step 4.)

- [ ] **Step 4: Add a placeholder export so the app builds before Task 9**

Create `src/lib/exportExcel.ts` with just the export function signature used above (fully implemented in Task 9):

```ts
import type { ProductWithStock } from '../types/database';

export function exportProductsToExcel(products: ProductWithStock[]) {
  // Full implementation added in Task 9.
  console.warn('exportProductsToExcel not yet implemented', products.length);
}
```

- [ ] **Step 5: Wire the route into `App.tsx`**

Replace the `/` route's inline element in `src/App.tsx` with `ProductListPage`:

```tsx
import ProductListPage from './features/products/ProductListPage';
```

```tsx
<Route
  path="/"
  element={
    <ProtectedRoute>
      <ProductListPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in with one of the 4 accounts, confirm the product list loads (empty at this point) and the search/low-stock/export controls render without errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add product list page with search and low-stock filter"
```

---

### Task 6: Add/Edit product form (with real-time JPY/RMB conversion)

**Files:**
- Create: `src/features/settings/useExchangeRate.ts`
- Create: `src/features/products/ProductForm.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `NewProduct`/`Product` types (Task 2), `jpyFromRmb`/`rmbFromJpy` (Task 4), `useRealtimeTable` (Task 5).
- Produces: `useExchangeRate(): { rate: ExchangeRate | null, updateRate: (rmbToJpy: number) => Promise<void> }`, consumed by `ProductForm` here and `ExchangeRateBadge` (Task 9). `<ProductForm mode="create" | "edit" productId?={number} />`, routed at `/products/new` and `/products/:id/edit`.

- [ ] **Step 1: Write `useExchangeRate`**

`src/features/settings/useExchangeRate.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ExchangeRate } from '../../types/database';

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('exchange_rate').select('*').eq('id', 1).single();
    if (data) setRate(data as ExchangeRate);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('exchange_rate', refetch);

  const updateRate = useCallback(async (rmbToJpy: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from('exchange_rate')
      .update({ rmb_to_jpy: rmbToJpy, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq('id', 1);
  }, []);

  return { rate, updateRate };
}
```

- [ ] **Step 2: Write `ProductForm`**

`src/features/products/ProductForm.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { jpyFromRmb, rmbFromJpy } from '../../lib/currency';
import { useExchangeRate } from '../settings/useExchangeRate';
import type { NewProduct, Product } from '../../types/database';

const emptyForm: NewProduct = {
  name_cn: '',
  name_en: null,
  material_cn: null,
  material_jp: null,
  sku: null,
  box_qty: null,
  ctn: null,
  net_weight: null,
  gross_weight: null,
  length: null,
  width: null,
  height: null,
  cbm: null,
  price_jpy: null,
  price_rmb: null,
  reorder_point: null,
  opening_stock: 0,
  photo_url: null,
};

export default function ProductForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rate } = useExchangeRate();
  const [form, setForm] = useState<NewProduct>(emptyForm);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (mode === 'edit' && id) {
      supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setForm(data as Product);
          setLoading(false);
        });
    }
  }, [mode, id]);

  function field<K extends keyof NewProduct>(key: K) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const isNumeric = typeof emptyForm[key] === 'number' || emptyForm[key] === null;
        setForm((f) => ({ ...f, [key]: raw === '' ? null : isNumeric ? Number(raw) : raw }));
      },
    };
  }

  function handleJpyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const jpy = e.target.value === '' ? null : Number(e.target.value);
    setForm((f) => ({
      ...f,
      price_jpy: jpy,
      price_rmb: jpy != null && rate ? rmbFromJpy(jpy, rate.rmb_to_jpy) : f.price_rmb,
    }));
  }

  function handleRmbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rmb = e.target.value === '' ? null : Number(e.target.value);
    setForm((f) => ({
      ...f,
      price_rmb: rmb,
      price_jpy: rmb != null && rate ? jpyFromRmb(rmb, rate.rmb_to_jpy) : f.price_jpy,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      const { data, error } = await supabase.from('products').insert(form).select('id').single();
      if (!error && data) navigate(`/products/${data.id}`);
    } else if (id) {
      const { error } = await supabase
        .from('products')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) navigate(`/products/${id}`);
    }
  }

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6 p-4">
      <section>
        <p className="mb-2 text-sm text-gray-500">基本信息</p>
        <label className="mb-1 block text-xs text-gray-400">品名</label>
        <input required className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2" {...field('name_cn')} />
        <label className="mb-1 block text-xs text-gray-400">罗马字 / 英文名（选填）</label>
        <input className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2" {...field('name_en')} />
        <label className="mb-1 block text-xs text-gray-400">品番（选填）</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('sku')} />
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">材质</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">材质（中文）</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('material_cn')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">材質（日文）</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('material_jp')} />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">包装参数</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">数/箱</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('box_qty')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">CTN箱数</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('ctn')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">CBM</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('cbm')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">净重(kg)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('net_weight')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">毛重(kg)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('gross_weight')} />
          </div>
          <div />
          <div>
            <label className="mb-1 block text-xs text-gray-400">长(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('length')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">宽(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('width')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">高(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('height')} />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">
          价格 {rate && <span className="text-gray-400">（当前汇率 1 RMB = {rate.rmb_to_jpy} JPY）</span>}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">日元单价</label>
            <input
              type="number"
              value={form.price_jpy ?? ''}
              onChange={handleJpyChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">单价(RMB)</label>
            <input
              type="number"
              value={form.price_rmb ?? ''}
              onChange={handleRmbChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">库存设置</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">期初库存</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('opening_stock')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">预警线</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('reorder_point')} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
        <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          取消
        </button>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
          保存商品
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Wire routes into `App.tsx`**

```tsx
import ProductForm from './features/products/ProductForm';
```

```tsx
<Route path="/products/new" element={<ProtectedRoute><ProductForm mode="create" /></ProtectedRoute>} />
<Route path="/products/:id/edit" element={<ProtectedRoute><ProductForm mode="edit" /></ProtectedRoute>} />
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Log in, click "+ 新增商品", fill in 品名 and 日元单价, confirm 单价(RMB) auto-fills using the seed rate (20.0 from the schema), submit, and confirm it lands on `/products/:id` (this route is a placeholder until Task 7 — a blank page is fine for now, check the Network tab / Supabase Table Editor to confirm the row was inserted).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add product create/edit form with real-time JPY/RMB conversion"
```

---

### Task 7: Product detail page (info card + quick-entry form + flow timeline)

**Files:**
- Create: `src/features/products/useProduct.ts`
- Create: `src/features/transactions/useTransactions.ts`
- Create: `src/features/transactions/TransactionForm.tsx`
- Create: `src/features/products/ProductDetailPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase`, `ProductWithStock`/`Transaction`/`NewTransaction` types (Task 2), `useAuth` (Task 3), `useRealtimeTable` (Task 5).
- Produces: `useProduct(id: number): { product: ProductWithStock | null, loading: boolean }`; `useTransactions(productId?: number): { transactions: TransactionWithProduct[], loading: boolean }` (no `productId` = all transactions, used again in Task 8); `<TransactionForm productId?={number} onCreated={() => void} />` (product picker shown only when `productId` is omitted, reused in Task 8).

- [ ] **Step 1: Write `useProduct`**

`src/features/products/useProduct.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ProductWithStock } from '../../types/database';

export function useProduct(id: number) {
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('products_with_stock').select('*').eq('id', id).single();
    setProduct((data as ProductWithStock) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('products', refetch);
  useRealtimeTable('transactions', refetch);

  return { product, loading };
}
```

- [ ] **Step 2: Write `useTransactions`**

`src/features/transactions/useTransactions.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { TransactionWithProduct } from '../../types/database';

export function useTransactions(productId?: number) {
  const [transactions, setTransactions] = useState<TransactionWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    let query = supabase
      .from('transactions')
      .select('*, product:products(id, name_cn, sku)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (productId != null) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (!error && data) setTransactions(data as unknown as TransactionWithProduct[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('transactions', refetch);

  return { transactions, loading };
}
```

- [ ] **Step 3: Write `TransactionForm`**

`src/features/transactions/TransactionForm.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import type { NewTransaction, Product, TransactionType } from '../../types/database';

const typeLabels: Record<TransactionType, string> = {
  inbound: '入库',
  outbound: '出库',
  order: '订单',
};

export function TransactionForm({
  productId,
  onCreated,
}: {
  productId?: number;
  onCreated: () => void;
}) {
  const { session } = useAuth();
  const [type, setType] = useState<TransactionType>('inbound');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name_cn' | 'sku'>[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(productId);

  useEffect(() => {
    if (productId == null) {
      supabase
        .from('products')
        .select('id, name_cn, sku')
        .order('name_cn')
        .then(({ data }) => setProducts((data as Pick<Product, 'id' | 'name_cn' | 'sku'>[]) ?? []));
    }
  }, [productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const targetProductId = productId ?? selectedProductId;
    if (!targetProductId || !quantity) return;

    const payload: NewTransaction & { created_by?: string } = {
      product_id: targetProductId,
      type,
      quantity: Number(quantity),
      date,
      note: note || null,
      created_by: session?.user.id,
    };

    if (type === 'outbound') {
      const { data: stockRow } = await supabase
        .from('products_with_stock')
        .select('current_stock')
        .eq('id', targetProductId)
        .single();
      const currentStock = (stockRow as { current_stock: number } | null)?.current_stock ?? 0;
      if (currentStock - Number(quantity) < 0) {
        const confirmed = window.confirm(
          `出库后库存会变成 ${currentStock - Number(quantity)}，数量是否填错了？确认要继续吗？`
        );
        if (!confirmed) return;
      }
    }

    const { error } = await supabase.from('transactions').insert(payload);
    if (!error) {
      setQuantity('');
      setNote('');
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md bg-gray-50 p-4">
      {productId == null && (
        <select
          required
          value={selectedProductId ?? ''}
          onChange={(e) => setSelectedProductId(Number(e.target.value))}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            选择商品
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_cn} {p.sku ? `(${p.sku})` : ''}
            </option>
          ))}
        </select>
      )}
      <div className="mb-2 flex gap-2">
        {(['inbound', 'outbound', 'order'] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              type === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'
            }`}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          required
          placeholder="数量"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="min-w-[100px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-[140px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="备注（选填）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-w-[140px] flex-[2] rounded-md border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
          提交
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Write `ProductDetailPage`**

`src/features/products/ProductDetailPage.tsx`:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProduct } from './useProduct';
import { useTransactions } from '../transactions/useTransactions';
import { TransactionForm } from '../transactions/TransactionForm';
import type { TransactionType } from '../../types/database';

const typeStyles: Record<TransactionType, string> = {
  inbound: 'bg-green-50 text-green-700',
  outbound: 'bg-red-50 text-red-700',
  order: 'bg-gray-100 text-gray-600',
};
const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export default function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number(id);
  const { product, loading } = useProduct(productId);
  const { transactions, loading: txLoading } = useTransactions(productId);
  const navigate = useNavigate();

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;
  if (!product) return <div className="p-4 text-gray-500">找不到这个商品</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Link to="/" className="text-sm text-gray-500">
        ← 返回商品列表
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-base font-medium">{product.name_cn}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              编号 {String(product.id).padStart(4, '0')} · 品番 {product.sku ?? '-'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/products/${product.id}/edit`)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            编辑资料
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-400">材质</p>
            <p className="text-sm">{product.material_cn ?? product.material_jp ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">数/箱</p>
            <p className="text-sm">{product.box_qty ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">单价(RMB)</p>
            <p className="text-sm">{product.price_rmb ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">实时库存</p>
            <p className="text-sm font-medium">{product.current_stock}</p>
          </div>
        </div>
      </div>

      <TransactionForm productId={product.id} onCreated={() => {}} />

      <div>
        <p className="mb-2 text-sm text-gray-500">历史流水</p>
        {txLoading ? (
          <p className="text-sm text-gray-400">加载中…</p>
        ) : (
          <div className="flex flex-col">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-b border-gray-200 py-2.5">
                <span className="w-16 shrink-0 text-xs text-gray-400">{t.date}</span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${typeStyles[t.type]}`}>
                  {typeLabels[t.type]}
                </span>
                <span className="flex-1 text-sm">
                  {t.type === 'outbound' ? '-' : '+'}
                  {t.quantity}
                </span>
                <span className="text-xs text-gray-400">{t.note ?? ''}</span>
              </div>
            ))}
            {transactions.length === 0 && <p className="py-2 text-sm text-gray-400">还没有流水记录</p>}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire the route into `App.tsx`**

```tsx
import ProductDetailPage from './features/products/ProductDetailPage';
```

```tsx
<Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
```

Route order matters: `/products/new` and `/products/:id/edit` must be declared before `/products/:id` so `"new"` isn't matched as an `:id`. Verify the final `<Routes>` block in `App.tsx` lists them in this order: `/products/new`, `/products/:id/edit`, `/products/:id`.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. Open a product from the list, submit an 入库 transaction via the quick-entry form, confirm the 实时库存 number and the flow timeline update without a manual page refresh (Realtime). Try an 出库 large enough to go negative and confirm the confirmation dialog appears.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add product detail page with quick-entry form and flow timeline"
```

---

### Task 8: All-transactions ledger page

**Files:**
- Create: `src/features/transactions/LedgerPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useTransactions()` (Task 7, called with no `productId`), `TransactionForm` (Task 7), `exportTransactionsToExcel` (implemented in Task 9; add a placeholder here the same way Task 5 did for `exportProductsToExcel`).

- [ ] **Step 1: Add the ledger export placeholder**

Append to `src/lib/exportExcel.ts` (implemented fully in Task 9):

```ts
import type { TransactionWithProduct } from '../types/database';

export function exportTransactionsToExcel(transactions: TransactionWithProduct[]) {
  // Full implementation added in Task 9.
  console.warn('exportTransactionsToExcel not yet implemented', transactions.length);
}
```

- [ ] **Step 2: Write `LedgerPage`**

`src/features/transactions/LedgerPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useTransactions } from './useTransactions';
import { TransactionForm } from './TransactionForm';
import { exportTransactionsToExcel } from '../../lib/exportExcel';
import type { TransactionType } from '../../types/database';

const typeStyles: Record<TransactionType, string> = {
  inbound: 'bg-green-50 text-green-700',
  outbound: 'bg-red-50 text-red-700',
  order: 'bg-gray-100 text-gray-600',
};
const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export default function LedgerPage() {
  const { transactions, loading } = useTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (!term) return true;
      return (
        t.product.name_cn.toLowerCase().includes(term) ||
        (t.product.sku ?? '').toLowerCase().includes(term)
      );
    });
  }, [transactions, search, typeFilter, from, to]);

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="搜索品名 / 品番"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-[2] rounded-md border border-gray-300 px-3 py-2"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          className="min-w-[100px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="all">全部类型</option>
          <option value="inbound">入库</option>
          <option value="outbound">出库</option>
          <option value="order">订单</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-[130px] flex-1 rounded-md border border-gray-300 px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-[130px] flex-1 rounded-md border border-gray-300 px-3 py-2" />
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
          + 登记一笔
        </button>
        <button
          onClick={() => exportTransactionsToExcel(filtered)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          导出 Excel
        </button>
      </div>

      {showForm && (
        <div className="mb-4">
          <TransactionForm onCreated={() => setShowForm(false)} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">日期</th>
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 font-medium">类型</th>
              <th className="px-2 py-2 text-right font-medium">数量</th>
              <th className="px-2 py-2 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-gray-200">
                <td className="whitespace-nowrap px-2 py-2">{t.date}</td>
                <td className="px-2 py-2">{t.product.name_cn}</td>
                <td className="px-2 py-2 text-gray-400">{t.product.sku ?? '-'}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${typeStyles[t.type]}`}>{typeLabels[t.type]}</span>
                </td>
                <td className="px-2 py-2 text-right">{t.quantity}</td>
                <td className="px-2 py-2 text-gray-500">{t.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-4 text-sm text-gray-400">没有符合条件的记录</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the route and top nav into `App.tsx`**

Add the route:

```tsx
import LedgerPage from './features/transactions/LedgerPage';
```

```tsx
<Route path="/ledger" element={<ProtectedRoute><LedgerPage /></ProtectedRoute>} />
```

Add a simple nav so both pages are reachable — wrap the two protected page routes in a shared layout. Replace the `Routes` block in `src/App.tsx` with:

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="flex gap-4 border-b border-gray-200 px-4 py-3 text-sm">
        <Link to="/" className="font-medium">商品列表</Link>
        <Link to="/ledger" className="font-medium">全部流水</Link>
      </nav>
      {children}
    </div>
  );
}
```

```tsx
<Route path="/" element={<ProtectedRoute><Layout><ProductListPage /></Layout></ProtectedRoute>} />
<Route path="/products/new" element={<ProtectedRoute><Layout><ProductForm mode="create" /></Layout></ProtectedRoute>} />
<Route path="/products/:id/edit" element={<ProtectedRoute><Layout><ProductForm mode="edit" /></Layout></ProtectedRoute>} />
<Route path="/products/:id" element={<ProtectedRoute><Layout><ProductDetailPage /></Layout></ProtectedRoute>} />
<Route path="/ledger" element={<ProtectedRoute><Layout><LedgerPage /></Layout></ProtectedRoute>} />
```

Add `import { Link } from 'react-router-dom';` alongside the existing router imports at the top of `App.tsx`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Click "全部流水" in the nav, confirm transactions from every product appear, filters narrow the list, and "登记一笔" lets you pick any product and add a row that immediately appears.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add all-transactions ledger page with filters"
```

---

### Task 9: Excel export + exchange rate editor badge

**Files:**
- Modify: `src/lib/exportExcel.ts`
- Create: `src/lib/exportExcel.test.ts`
- Create: `src/features/settings/ExchangeRateBadge.tsx`
- Modify: `src/App.tsx` (mount the badge in `Layout`)

**Interfaces:**
- Consumes: `ProductWithStock`/`TransactionWithProduct` types (Task 2), `useExchangeRate` (Task 6).
- Produces: fully working `exportProductsToExcel`, `exportTransactionsToExcel` (replacing the Task 5/8 placeholders); `<ExchangeRateBadge />`.

- [ ] **Step 1: Write the failing tests for the row-shaping logic**

`src/lib/exportExcel.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { productsToRows, transactionsToRows } from './exportExcel';
import type { ProductWithStock, TransactionWithProduct } from '../types/database';

function makeProduct(overrides: Partial<ProductWithStock> = {}): ProductWithStock {
  return {
    id: 1,
    name_cn: '示例商品 A',
    name_en: null,
    material_cn: '铝',
    material_jp: null,
    sku: 'tube-120P',
    box_qty: 25,
    ctn: 20,
    net_weight: null,
    gross_weight: null,
    length: null,
    width: null,
    height: null,
    cbm: null,
    price_jpy: 440,
    price_rmb: 12.1,
    reorder_point: 100,
    opening_stock: 0,
    photo_url: null,
    created_at: '',
    updated_at: '',
    current_stock: 1300,
    latest_date: '2026-08-11',
    latest_type: 'outbound',
    latest_quantity: 500,
    ...overrides,
  };
}

describe('productsToRows', () => {
  test('maps a product to a flat export row with Chinese headers', () => {
    const rows = productsToRows([makeProduct()]);
    expect(rows).toEqual([
      {
        编号: 1,
        品名: '示例商品 A',
        品番: 'tube-120P',
        材质: '铝',
        数箱: 25,
        日元单价: 440,
        单价RMB: 12.1,
        实时库存: 1300,
      },
    ]);
  });
});

describe('transactionsToRows', () => {
  test('maps a transaction to a flat export row', () => {
    const tx: TransactionWithProduct = {
      id: 1,
      product_id: 1,
      type: 'outbound',
      quantity: 500,
      date: '2026-08-11',
      note: '商事海运 3/16装柜',
      created_by: null,
      created_at: '',
      product: { id: 1, name_cn: '示例商品 A', sku: 'tube-120P' },
    };
    expect(transactionsToRows([tx])).toEqual([
      { 日期: '2026-08-11', 品名: '示例商品 A', 品番: 'tube-120P', 类型: '出库', 数量: 500, 备注: '商事海运 3/16装柜' },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- exportExcel`
Expected: FAIL — `productsToRows`/`transactionsToRows` are not exported yet.

- [ ] **Step 3: Implement `exportExcel.ts` in full**

Replace the entire contents of `src/lib/exportExcel.ts`:

```ts
import * as XLSX from 'xlsx';
import type { ProductWithStock, TransactionType, TransactionWithProduct } from '../types/database';

const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export function productsToRows(products: ProductWithStock[]) {
  return products.map((p) => ({
    编号: p.id,
    品名: p.name_cn,
    品番: p.sku ?? '',
    材质: p.material_cn ?? p.material_jp ?? '',
    数箱: p.box_qty ?? '',
    日元单价: p.price_jpy ?? '',
    单价RMB: p.price_rmb ?? '',
    实时库存: p.current_stock,
  }));
}

export function transactionsToRows(transactions: TransactionWithProduct[]) {
  return transactions.map((t) => ({
    日期: t.date,
    品名: t.product.name_cn,
    品番: t.product.sku ?? '',
    类型: typeLabels[t.type],
    数量: t.quantity,
    备注: t.note ?? '',
  }));
}

function downloadWorkbook(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function exportProductsToExcel(products: ProductWithStock[]) {
  downloadWorkbook(productsToRows(products), '商品库存', `商品库存_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTransactionsToExcel(transactions: TransactionWithProduct[]) {
  downloadWorkbook(transactionsToRows(transactions), '流水明细', `流水明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- exportExcel`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Write `ExchangeRateBadge`**

`src/features/settings/ExchangeRateBadge.tsx`:

```tsx
import { useState } from 'react';
import { useExchangeRate } from './useExchangeRate';

export function ExchangeRateBadge() {
  const { rate, updateRate } = useExchangeRate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!rate) return null;

  if (editing) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await updateRate(Number(value));
          setEditing(false);
        }}
        className="flex items-center gap-2 text-sm"
      >
        <span>1 RMB =</span>
        <input
          type="number"
          autoFocus
          defaultValue={rate.rmb_to_jpy}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded-md border border-gray-300 px-2 py-1"
        />
        <span>JPY</span>
        <button type="submit" className="text-gray-900 underline">
          保存
        </button>
      </form>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-sm text-gray-500">
      当前汇率 1 RMB = {rate.rmb_to_jpy} JPY <span className="underline">编辑</span>
    </button>
  );
}
```

- [ ] **Step 7: Mount the badge in the nav**

In `src/App.tsx`, import and render it inside `Layout`'s `<nav>`:

```tsx
import { ExchangeRateBadge } from './features/settings/ExchangeRateBadge';
```

```tsx
<nav className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 text-sm">
  <div className="flex gap-4">
    <Link to="/" className="font-medium">商品列表</Link>
    <Link to="/ledger" className="font-medium">全部流水</Link>
  </div>
  <ExchangeRateBadge />
</nav>
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev`. On the product list page, click "导出 Excel" and confirm a `.xlsx` file downloads and opens with the expected Chinese headers. Do the same from the ledger page. Click the exchange rate badge in the nav, change the value, save, and confirm a product form's JPY/RMB auto-conversion now uses the new rate.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: implement Excel export and exchange rate editor badge"
```

---

### Task 10: Deploy to Cloudflare Pages

**Files:**
- Create: `.env.production` is **not** created (Cloudflare Pages env vars are set in its dashboard, not committed)
- Modify: `package.json` (confirm `build` script)
- Create: `README.md` (deployment notes)

**Interfaces:**
- Consumes: the finished Vite app (`npm run build` → `dist/`).
- Produces: a public HTTPS URL serving the app.

- [ ] **Step 1: Verify the production build works locally**

Run: `npm run build`
Expected: exits 0, creates a `dist/` folder.

Run: `npm run preview`
Expected: serves the build locally; open it in a browser and confirm the login page renders (Supabase calls will fail without env vars loaded by Vite at build time — that's expected here, real env vars are supplied by Cloudflare at their build step).

- [ ] **Step 2: Push the repo to GitHub**

```bash
gh repo create 中国库存系统 --private --source=. --remote=origin
git push -u origin master
```

- [ ] **Step 3: Connect the repo in Cloudflare Pages**

In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git → select the repo. Build settings:
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`

- [ ] **Step 4: Add environment variables in Cloudflare Pages**

Pages project → Settings → Environment variables → add for both Production and Preview:
- `VITE_SUPABASE_URL` = (same value as local `.env`)
- `VITE_SUPABASE_ANON_KEY` = (same value as local `.env`)

- [ ] **Step 5: Trigger a deploy and verify**

Cloudflare auto-deploys on push, or click "Retry deployment" in the dashboard. Once it succeeds, open the generated `*.pages.dev` URL, log in with one of the 4 accounts, and confirm the product list loads real data from Supabase.

- [ ] **Step 6: Verify on mobile**

Open the same URL on a phone browser, confirm the product list and ledger pages are usable (horizontal scroll on the dense tables is expected and fine per the spec).

- [ ] **Step 7: Write `README.md`**

`README.md`:

```markdown
# 中国库存系统

React + Supabase + Cloudflare Pages 库存管理系统。设计文档见 `docs/superpowers/specs/2026-08-11-inventory-system-design.md`。

## 本地开发

1. `npm install`
2. 复制 `.env.example` 为 `.env`，填入 Supabase 项目的 URL 和 anon key
3. `npm run dev`

## 部署

推送到 `master` 分支后 Cloudflare Pages 自动构建部署。环境变量在 Cloudflare Pages 项目设置里配置，不提交到仓库。

## 数据库

`supabase/schema.sql` 是完整的建表脚本，在 Supabase SQL Editor 里执行一次即可。
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: add README with local dev and deployment instructions"
```

---

### Task 11: Migrate existing product data from the old Excel file

**Files:**
- Create: `scripts/migrate-products.mjs`

**Interfaces:**
- Consumes: `@supabase/supabase-js`, `xlsx` (already installed in Task 1); the `products` table schema (Task 2).
- Produces: populated `products` rows in the live Supabase project, each with `opening_stock` set from the sheet's "实时库存" column.

- [ ] **Step 1: Get a service role key for this one-off script**

In the Supabase dashboard: Project Settings → API → copy the `service_role` key (bypasses RLS — needed for a bulk import; the app itself never uses this key). Store it only in a local, gitignored file:

```bash
echo "SUPABASE_SERVICE_ROLE_KEY=eyJ..." >> .env.migration
echo ".env.migration" >> .gitignore
```

- [ ] **Step 2: Write the migration script**

`scripts/migrate-products.mjs`:

```js
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.migration' });

const SOURCE_FILE = process.argv[2];
if (!SOURCE_FILE) {
  console.error('Usage: node scripts/migrate-products.mjs <path-to-old-excel-file.xlsx>');
  process.exit(1);
}

// Column indices (0-based) as found in the original "中国库存用.xlsx" sheet
// "20260722库存". Verify these against the actual file before running --
// the sheet has merged header cells and stray values, this mapping was
// derived by manual inspection, not a machine-readable header row.
const COLUMNS = {
  name_cn: 4, // ITEM
  name_en: 5, // romaji / English name
  material_cn: 7, // 材质
  material_jp: 8, // 材質
  sku: 9, // 品番
  box_qty: 17, // 数/箱
  ctn: 18, // CTN
  net_weight: 19, // N.W
  gross_weight: 20, // G.W
  length: 23, // L
  width: 24, // W
  height: 25, // H
  cbm: 26, // CBM
  price_jpy: 27, // 日元价格
  price_rmb: 29, // 单价(RMB)
  opening_stock: 32, // 实时库存 -- becomes each product's opening_stock
};
const FIRST_DATA_ROW = 3; // rows 0-1 are headers (0-indexed), data starts at row index 2 in most exports; verify against your file

function toNumberOrNull(v) {
  if (v === undefined || v === '' || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTextOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

const workbook = XLSX.readFile(readFileSync(SOURCE_FILE));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

const products = rows
  .slice(FIRST_DATA_ROW)
  .filter((row) => toTextOrNull(row[COLUMNS.name_cn]) !== null)
  .map((row) => ({
    name_cn: String(row[COLUMNS.name_cn]).trim(),
    name_en: toTextOrNull(row[COLUMNS.name_en]),
    material_cn: toTextOrNull(row[COLUMNS.material_cn]),
    material_jp: toTextOrNull(row[COLUMNS.material_jp]),
    sku: toTextOrNull(row[COLUMNS.sku]),
    box_qty: toNumberOrNull(row[COLUMNS.box_qty]),
    ctn: toNumberOrNull(row[COLUMNS.ctn]),
    net_weight: toNumberOrNull(row[COLUMNS.net_weight]),
    gross_weight: toNumberOrNull(row[COLUMNS.gross_weight]),
    length: toNumberOrNull(row[COLUMNS.length]),
    width: toNumberOrNull(row[COLUMNS.width]),
    height: toNumberOrNull(row[COLUMNS.height]),
    cbm: toNumberOrNull(row[COLUMNS.cbm]),
    price_jpy: toNumberOrNull(row[COLUMNS.price_jpy]),
    price_rmb: toNumberOrNull(row[COLUMNS.price_rmb]),
    opening_stock: toNumberOrNull(row[COLUMNS.opening_stock]) ?? 0,
  }));

console.log(`Parsed ${products.length} products from ${SOURCE_FILE}. First 3:`);
console.log(products.slice(0, 3));

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('products').insert(products).select('id');
if (error) {
  console.error('Insert failed:', error);
  process.exit(1);
}
console.log(`Inserted ${data.length} products.`);
```

- [ ] **Step 3: Install the script's one extra dependency**

```bash
npm install -D dotenv
```

- [ ] **Step 4: Dry-run inspect the parsed output before inserting**

Temporarily comment out the `supabase.from('products').insert(...)` block's execution (or run against a throwaway Supabase project first) and run:

```bash
node scripts/migrate-products.mjs "C:\Users\ekou0\Desktop\Coding\中国库存用.xlsx"
```

Expected: the console log prints a plausible product count (roughly matching the ~440 data rows) and the first 3 parsed objects have correctly-populated `name_cn`, `sku`, and `opening_stock` fields — compare a couple by eye against the original spreadsheet. If a field looks shifted (e.g. `sku` values showing up under `material_jp`), fix the corresponding index in `COLUMNS` and re-run before proceeding.

- [ ] **Step 5: Run the real import**

Re-enable the insert call if you commented it out, then run the same command against the real Supabase project:

```bash
node scripts/migrate-products.mjs "C:\Users\ekou0\Desktop\Coding\中国库存用.xlsx"
```

Expected: `Inserted N products.` with `N` matching the count from Step 4.

- [ ] **Step 6: Verify in the app**

Run: `npm run dev` (or use the deployed Cloudflare Pages URL), confirm the product list now shows the real product data with `实时库存` equal to each product's `opening_stock` (no transactions yet, so `current_stock == opening_stock`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add one-off script to migrate product data from the old Excel file"
```

Do **not** commit `.env.migration` — confirm `git status` shows it ignored.

---

## Self-Review Notes

- **Spec coverage:** architecture (Task 1-2, 10), data model incl. exchange rate (Task 2), auth (Task 3), product list (Task 5), add/edit form incl. real-time conversion (Task 6), product detail + flow (Task 7), all-transactions ledger (Task 8), Excel export (Task 9), error handling for negative stock (Task 7 `TransactionForm`), realtime multi-user sync (Task 5/6/7/8 all use `useRealtimeTable`), data migration scope — product master + opening stock only, no historical transactions (Task 11) — all covered.
- **Type consistency checked:** `ProductWithStock`, `Transaction`, `TransactionWithProduct`, `NewProduct`, `NewTransaction`, `ExchangeRate` are defined once in Task 2 and reused verbatim by name in every later task; `TransactionType` union (`'inbound' | 'outbound' | 'order'`) and its Chinese labels are defined identically in Task 7 and Task 8 (small intentional duplication — each is a self-contained page component; extracting a shared `typeLabels` constant into `src/lib` is a reasonable future cleanup but not required for either page to work).
- **Not covered by this plan, deliberately (per spec's "本期不做")**: product photo upload, per-role permissions, live exchange-rate API, bulk historical-transaction import.
