-- =============================================================
-- Mongeton — schéma initial (version simplifiée d'Ivy Wallet)
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- =============================================================

-- ---------- Types ----------
create type public.currency_code as enum ('XOF', 'GHS', 'USD');
create type public.transaction_type as enum ('income', 'expense', 'transfer');

-- ---------- Profils (1 ligne par utilisateur) ----------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  base_currency public.currency_code not null default 'XOF',
  created_at    timestamptz not null default now()
);

-- ---------- Comptes ----------
create table public.accounts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  currency           public.currency_code not null default 'XOF',
  initial_balance    numeric(18, 2) not null default 0,
  color              text not null default '#5C3DF5',
  include_in_balance boolean not null default true,
  created_at         timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts (user_id);

-- ---------- Catégories ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  color      text not null default '#74747A',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index categories_user_id_idx on public.categories (user_id);

-- ---------- Transactions ----------
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type          public.transaction_type not null,
  account_id    uuid not null references public.accounts (id) on delete cascade,
  amount        numeric(18, 2) not null check (amount > 0),
  -- Virements uniquement
  to_account_id uuid references public.accounts (id) on delete cascade,
  to_amount     numeric(18, 2) check (to_amount is null or to_amount > 0),
  category_id   uuid references public.categories (id) on delete set null,
  title         text,
  note          text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  -- Les règles qu'Ivy vérifie seulement dans son mapper Kotlin :
  constraint transfer_needs_destination check (
    (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (type <> 'transfer' and to_account_id is null and to_amount is null)
  )
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id);

-- ---------- Taux de change (communs à tous) ----------
-- rate = nombre d'unités de `currency` pour 1 USD.
create table public.exchange_rates (
  currency   public.currency_code primary key,
  rate       numeric(18, 6) not null check (rate > 0),
  updated_at timestamptz not null default now()
);
-- Valeurs INDICATIVES à mettre à jour (Table Editor ou étape Vercel Cron).
insert into public.exchange_rates (currency, rate) values
  ('USD', 1),
  ('XOF', 600),
  ('GHS', 12);

-- =============================================================
-- Sécurité : Row Level Security
-- =============================================================
alter table public.profiles       enable row level security;
alter table public.accounts       enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.exchange_rates enable row level security;

-- Profils : chacun ne voit / modifie que le sien (créé par trigger)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Comptes et catégories : CRUD sur ses propres lignes
create policy "accounts_all_own" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories_all_own" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Transactions : en écriture, on vérifie aussi que les comptes et la
-- catégorie référencés appartiennent à l'utilisateur (une clé étrangère
-- seule ne l'empêcherait pas de pointer vers le compte d'un autre).
create policy "transactions_select_own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (to_account_id is null or exists (select 1 from public.accounts a where a.id = to_account_id and a.user_id = (select auth.uid())))
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
  );
create policy "transactions_update_own" on public.transactions
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (to_account_id is null or exists (select 1 from public.accounts a where a.id = to_account_id and a.user_id = (select auth.uid())))
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
  );

-- Taux : lecture seule pour les utilisateurs connectés
create policy "exchange_rates_read" on public.exchange_rates
  for select to authenticated using (true);

-- =============================================================
-- Vue : solde de chaque compte (dans la devise du compte)
-- security_invoker => la vue respecte la RLS de l'appelant
-- =============================================================
create view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.initial_balance
    + coalesce(sum(case
        when t.type = 'income'   and t.account_id    = a.id then  t.amount
        when t.type = 'expense'  and t.account_id    = a.id then -t.amount
        when t.type = 'transfer' and t.account_id    = a.id then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id then  coalesce(t.to_amount, t.amount)
      end), 0) as balance
from public.accounts a
left join public.transactions t
  on t.account_id = a.id or t.to_account_id = a.id
group by a.id;

-- =============================================================
-- À l'inscription : profil + compte "Espèces" (FCFA) + catégories
-- =============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.accounts (user_id, name, currency, color)
  values (new.id, 'Espèces', 'XOF', '#12B880');

  insert into public.categories (user_id, name, color) values
    (new.id, 'Alimentation', '#F57A3D'),
    (new.id, 'Transport',    '#3193F5'),
    (new.id, 'Logement',     '#5C3DF5'),
    (new.id, 'Santé',        '#F53D3D'),
    (new.id, 'Loisirs',      '#F53D99'),
    (new.id, 'Salaire',      '#12B880'),
    (new.id, 'Autres',       '#74747A');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
