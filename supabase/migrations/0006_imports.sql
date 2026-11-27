-- =============================================================
-- Mongeton — transactions importées (relevé CSV, notifications Mobile Money)
-- `source` indique l'origine ; `external_id` est une empreinte stable de la
-- ligne d'origine qui empêche d'importer deux fois la même opération.
-- =============================================================

alter table public.transactions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'statement', 'notification')),
  add column if not exists external_id text;

-- Contrainte unique complète (et non index partiel) : nécessaire pour l'upsert
-- « ignorer les doublons » de l'API. Les NULL (saisies manuelles) restent autorisés en nombre.
alter table public.transactions
  drop constraint if exists transactions_user_external_key;
alter table public.transactions
  add constraint transactions_user_external_key unique (user_id, external_id);
