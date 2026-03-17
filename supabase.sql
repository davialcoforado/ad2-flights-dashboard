create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  saved_at text not null default '',
  cliente text not null default '',
  origem text not null default '',
  destino text not null default '',
  ida text not null default '',
  volta text not null default '',
  bagagem text not null default '',
  parcelamento_sem_juros text not null default '',
  valor_pagante_ref numeric not null default 0,
  comissao numeric not null default 0,
  milhas_totais numeric not null default 0,
  custo_total numeric not null default 0,
  preco_pix numeric not null default 0,
  lucro numeric not null default 0,
  lucro_percentual numeric not null default 0,
  economia numeric not null default 0,
  economia_percentual numeric not null default 0,
  companies jsonb not null default '[]'::jsonb,
  installments jsonb not null default '[]'::jsonb,
  offer_text text not null default ''
);

alter table public.quotes enable row level security;

drop policy if exists "public can read quotes" on public.quotes;
create policy "public can read quotes"
on public.quotes
for select
to anon
using (true);

drop policy if exists "public can insert quotes" on public.quotes;
create policy "public can insert quotes"
on public.quotes
for insert
to anon
with check (true);

drop policy if exists "public can delete quotes" on public.quotes;
create policy "public can delete quotes"
on public.quotes
for delete
to anon
using (true);
