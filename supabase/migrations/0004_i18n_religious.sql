-- =============================================================
-- Mongeton — langue, catégories traduisibles et dons religieux
-- (dîme, offrande, action de grâce).
-- =============================================================

-- ---------- Taux de l'euro ----------
-- Le FCFA (XOF) est arrimé à l'euro : 1 EUR = 655,957 XOF exactement.
-- On en déduit le taux EUR à partir du taux XOF existant pour rester cohérent.
insert into public.exchange_rates (currency, rate)
select 'EUR', round(rate / 655.957, 6) from public.exchange_rates where currency = 'XOF'
on conflict (currency) do nothing;

-- ---------- Préférences du profil ----------
alter table public.profiles
  add column if not exists language text not null default 'fr' check (language in ('fr', 'en')),
  add column if not exists religious_enabled boolean not null default false;

-- ---------- Catégories : clé système (traduction) + groupe ----------
-- `key` identifie une catégorie par défaut (le nom affiché est traduit côté app) ;
-- une catégorie créée par l'utilisateur a key = null et garde son nom.
alter table public.categories
  add column if not exists key text,
  add column if not exists is_religious boolean not null default false;

create unique index if not exists categories_user_key_idx
  on public.categories (user_id, key) where key is not null;

-- Rattache les catégories par défaut déjà créées à leur clé.
update public.categories set key = v.key
from (values
  ('Alimentation', 'food'), ('Transport', 'transport'), ('Logement', 'housing'),
  ('Santé', 'health'), ('Loisirs', 'leisure'), ('Salaire', 'salary'), ('Autres', 'other')
) as v(name, key)
where categories.name = v.name and categories.key is null;

-- Catégories religieuses pour les utilisateurs existants (affichées seulement si l'option est activée).
insert into public.categories (user_id, name, color, key, is_religious)
select p.id, v.name, v.color, v.key, true
from public.profiles p
cross join (values
  ('Dîme', '#B08A3E', 'tithe'),
  ('Offrande', '#CCB068', 'offering'),
  ('Action de grâce', '#164C28', 'thanksgiving')
) as v(name, color, key)
on conflict do nothing;

-- ---------- Inscription : profil (langue/option) + compte + catégories ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  lang text := case when meta ->> 'language' = 'en' then 'en' else 'fr' end;
  cur  public.currency_code := case
    when meta ->> 'currency' in ('XOF', 'GHS', 'USD', 'EUR') then (meta ->> 'currency')::public.currency_code
    else 'XOF' end;
begin
  insert into public.profiles (id, display_name, base_currency, language, religious_enabled)
  values (
    new.id,
    coalesce(meta ->> 'display_name', meta ->> 'full_name', split_part(new.email, '@', 1)),
    cur,
    lang,
    coalesce((meta ->> 'religious_enabled')::boolean, false)
  );

  insert into public.accounts (user_id, name, currency, color)
  values (new.id, case when lang = 'en' then 'Cash' else 'Espèces' end, cur, '#164C28');

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
