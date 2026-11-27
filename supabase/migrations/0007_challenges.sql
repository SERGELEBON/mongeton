-- =============================================================
-- Mongeton — Challenges : objectifs de dépenses par période
-- (semaine, mois, trimestre) et alertes « 80 % du budget consommé ».
-- =============================================================

create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  period      text not null check (period in ('week', 'month', 'quarter')),
  -- Plafond de dépenses dans la devise principale de l'utilisateur.
  amount      numeric(18, 2) not null check (amount > 0),
  -- null = toutes les dépenses ; sinon une seule catégorie.
  category_id uuid references public.categories (id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists challenges_user_idx on public.challenges (user_id);

-- Une alerte par challenge, par période et par niveau : jamais de doublon d'email.
create table if not exists public.challenge_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  period_start date not null,
  level        text not null check (level in ('warning', 'exceeded')),
  spent        numeric(18, 2) not null,
  created_at   timestamptz not null default now(),
  emailed_at   timestamptz,
  read_at      timestamptz,
  constraint challenge_alerts_unique unique (challenge_id, period_start, level)
);
create index if not exists challenge_alerts_user_idx on public.challenge_alerts (user_id, created_at desc);

alter table public.challenges       enable row level security;
alter table public.challenge_alerts enable row level security;

create policy "challenges_all_own" on public.challenges
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
  );

create policy "challenge_alerts_select_own" on public.challenge_alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "challenge_alerts_insert_own" on public.challenge_alerts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.challenges ch where ch.id = challenge_id and ch.user_id = (select auth.uid()))
  );
-- L'utilisateur peut marquer une alerte comme lue (emailed_at est géré par la fonction serveur).
create policy "challenge_alerts_update_own" on public.challenge_alerts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.challenges, public.challenge_alerts from anon, authenticated;
grant select, insert, update, delete on public.challenges       to authenticated;
grant select, insert, update         on public.challenge_alerts to authenticated;
