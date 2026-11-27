-- =============================================================
-- Mongeton — ajout de l'euro.
-- Postgres interdit d'utiliser une nouvelle valeur d'enum dans la même
-- transaction que son ajout : ce fichier doit être exécuté SEUL,
-- avant 0004_i18n_religious.sql.
-- =============================================================
alter type public.currency_code add value if not exists 'EUR';
