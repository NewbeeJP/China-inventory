-- Products (商品资料)
create table products (
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

-- Realtime: tables must belong to the supabase_realtime publication before the
-- client receives postgres_changes events -- without it, one person's entry
-- never reaches anyone else's screen until they reload. Supabase already adds
-- new tables on some projects, and re-adding one is a hard error, so only add
-- what is missing.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'transactions', 'exchange_rate'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
