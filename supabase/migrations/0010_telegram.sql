-- =============================================================
-- Mongeton — alertes par message Telegram (gratuit).
-- Liaison : l'app génère un code à usage unique (30 min) ; l'utilisateur
-- ouvre le bot avec ce code ; le webhook Telegram relie son chat au profil.
-- =============================================================

alter table public.profiles add column if not exists telegram_chat_id bigint;

-- L'app ne peut modifier que ses préférences (pas telegram_chat_id directement).
revoke update on public.profiles from authenticated;
grant update (display_name, base_currency, language, religious_enabled, country) on public.profiles to authenticated;

create table if not exists public.telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 minutes'
);
alter table public.telegram_link_codes enable row level security;
-- Aucune policy : la table n'est accessible qu'à travers les fonctions ci-dessous.
revoke all on public.telegram_link_codes from anon, authenticated;

-- 1. L'utilisateur connecté obtient un code de liaison.
create or replace function public.create_telegram_link_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.telegram_link_codes where user_id = auth.uid() or expires_at < now();
  insert into public.telegram_link_codes (code, user_id) values (v_code, auth.uid());
  return v_code;
end;
$$;

-- 2. Appelée par le webhook Telegram (sans session) : relie le chat si le code est valide.
create or replace function public.link_telegram(p_code text, p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  delete from public.telegram_link_codes
   where code = p_code and expires_at > now()
  returning user_id into v_user;
  if v_user is null then return false; end if;
  update public.profiles set telegram_chat_id = p_chat_id where id = v_user;
  return true;
end;
$$;

-- 3. L'utilisateur peut délier son Telegram.
create or replace function public.unlink_telegram()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set telegram_chat_id = null where id = (select auth.uid());
$$;

revoke all on function public.create_telegram_link_code(), public.link_telegram(text, bigint), public.unlink_telegram() from public;
grant execute on function public.create_telegram_link_code(), public.unlink_telegram() to authenticated;
grant execute on function public.link_telegram(text, bigint) to anon, authenticated;
