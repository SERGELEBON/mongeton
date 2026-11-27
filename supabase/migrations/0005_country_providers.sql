-- =============================================================
-- Mongeton — pays de l'utilisateur et fournisseur de chaque compte
-- (Mobile Money, Visa, banque, espèces).
-- =============================================================

alter table public.profiles
  add column if not exists country text check (country in ('CI', 'GH', 'OTHER'));

alter table public.accounts
  add column if not exists provider text not null default 'cash'
    check (provider in ('cash', 'bank', 'visa', 'mtn_momo', 'telecel_cash', 'orange_money', 'moov_money', 'wave'));

-- Inscription : on enregistre aussi le pays choisi à l'écran d'ouverture.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  lang text := case when meta ->> 'language' = 'en' then 'en' else 'fr' end;
  ctry text := case when meta ->> 'country' in ('CI', 'GH', 'OTHER') then meta ->> 'country' else null end;
  cur  public.currency_code := case
    when meta ->> 'currency' in ('XOF', 'GHS', 'USD', 'EUR') then (meta ->> 'currency')::public.currency_code
    when ctry = 'GH' then 'GHS'
    else 'XOF' end;
begin
  insert into public.profiles (id, display_name, base_currency, language, religious_enabled, country)
  values (
    new.id,
    coalesce(meta ->> 'display_name', meta ->> 'full_name', split_part(new.email, '@', 1)),
    cur,
    lang,
    coalesce((meta ->> 'religious_enabled')::boolean, false),
    ctry
  );

  insert into public.accounts (user_id, name, currency, color, provider)
  values (new.id, case when lang = 'en' then 'Cash' else 'Espèces' end, cur, '#164C28', 'cash');

  insert into public.categories (user_id, name, color, key, is_religious) values
    (new.id, 'Alimentation',    '#D9822B', 'food',         false),
    (new.id, 'Transport',       '#3B7DD8', 'transport',    false),
    (new.id, 'Logement',        '#6B5BD2', 'housing',      false),
    (new.id, 'Santé',           '#D64545', 'health',       false),
    (new.id, 'Loisirs',         '#C2468F', 'leisure',      false),
    (new.id, 'Salaire',         '#2E9E5B', 'salary',       false),
    (new.id, 'Autres',          '#74747A', 'other',        false),
    (new.id, 'Dîme',            '#B08A3E', 'tithe',        true),
    (new.id, 'Offrande',        '#CCB068', 'offering',     true),
    (new.id, 'Action de grâce', '#164C28', 'thanksgiving', true);

  return new;
end;
$$;
