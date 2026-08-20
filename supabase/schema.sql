-- 这个脚本可以反复执行：每一句都先判断存在与否，重跑不会报 already exists。

-- Products (商品资料)
create table if not exists products (
  id bigint generated always as identity primary key,
  name_cn text not null,
  name_en text,
  material text,
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
do $$ begin
  create type transaction_type as enum ('inbound', 'outbound', 'order');
exception
  when duplicate_object then null;
end $$;

-- Batches (批次): one shipment / factory delivery / factory order, covering many
-- products at once. A batch carries a single type -- a container going out is
-- all outbound, a delivery arriving is all inbound.
create table if not exists batches (
  id bigint generated always as identity primary key,
  name text not null,
  type transaction_type not null,
  date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  type transaction_type not null,
  quantity numeric not null,
  date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Nullable on purpose: a one-off entry that belongs to no batch stays valid.
alter table transactions add column if not exists batch_id bigint references batches(id) on delete set null;
create index if not exists transactions_batch_id_idx on transactions (batch_id);
create index if not exists transactions_product_id_idx on transactions (product_id);

-- Exchange rate (single-row settings table)
create table if not exists exchange_rate (
  id smallint primary key default 1,
  rmb_to_jpy numeric not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint exchange_rate_single_row check (id = 1)
);
alter table exchange_rate add column if not exists rmb_to_usd numeric;
insert into exchange_rate (id, rmb_to_jpy, rmb_to_usd) values (1, 20.0, 0.14)
  on conflict (id) do nothing;
update exchange_rate set rmb_to_usd = 0.14 where id = 1 and rmb_to_usd is null;

-- Current-stock view. 除了实时库存，还把三个累计数一起算出来，
-- 对应原表的「库存总数 / 出库总数 / 订单总数」——原来靠手工维护，这里自动汇总。
-- latest_* 只看出库（海运发货），即最近一次发了多少。
create or replace view products_with_stock
with (security_invoker = true) as
select
  p.*,
  p.opening_stock
    + coalesce(agg.inbound_total, 0)
    - coalesce(agg.outbound_total, 0) as current_stock,
  latest.date as latest_date,
  latest.type as latest_type,
  latest.quantity as latest_quantity,
  coalesce(agg.inbound_total, 0) as inbound_total,
  coalesce(agg.outbound_total, 0) as outbound_total,
  coalesce(agg.order_total, 0) as order_total,
  last_in.date as last_inbound_date,
  last_in.quantity as last_inbound_quantity,
  last_order.date as last_order_date,
  last_order.quantity as last_order_quantity
from products p
left join lateral (
  select
    sum(case when t.type = 'inbound' then t.quantity else 0 end) as inbound_total,
    sum(case when t.type = 'outbound' then t.quantity else 0 end) as outbound_total,
    sum(case when t.type = 'order' then t.quantity else 0 end) as order_total
  from transactions t
  where t.product_id = p.id
) agg on true
left join lateral (
  select t2.date, t2.type, t2.quantity
  from transactions t2
  where t2.product_id = p.id and t2.type = 'outbound'
  order by t2.date desc, t2.created_at desc
  limit 1
) latest on true
-- 最近一次入库（工厂送到仓库）
left join lateral (
  select t3.date, t3.quantity
  from transactions t3
  where t3.product_id = p.id and t3.type = 'inbound'
  order by t3.date desc, t3.created_at desc
  limit 1
) last_in on true
-- 最近一次订单：已下单还没到货，算预计入库
left join lateral (
  select t4.date, t4.quantity
  from transactions t4
  where t4.product_id = p.id and t4.type = 'order'
  order by t4.date desc, t4.created_at desc
  limit 1
) last_order on true;

-- Row Level Security: any authenticated user has full access, no anonymous access, no role tiers
alter table products enable row level security;
alter table transactions enable row level security;
alter table exchange_rate enable row level security;
alter table batches enable row level security;

drop policy if exists "authenticated full access" on products;
create policy "authenticated full access" on products
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on transactions;
create policy "authenticated full access" on transactions
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on exchange_rate;
create policy "authenticated full access" on exchange_rate
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on batches;
create policy "authenticated full access" on batches
  for all to authenticated using (true) with check (true);

-- Realtime: tables must belong to the supabase_realtime publication before the
-- client receives postgres_changes events -- without it, one person's entry
-- never reaches anyone else's screen until they reload. Supabase already adds
-- new tables on some projects, and re-adding one is a hard error, so only add
-- what is missing.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'transactions', 'exchange_rate', 'batches'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
