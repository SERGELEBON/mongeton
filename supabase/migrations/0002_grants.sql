-- =============================================================
-- Mongeton — droits d'accès à l'API (PostgREST)
-- Les projets Supabase récents n'accordent plus automatiquement
-- SELECT/INSERT/... sur les nouvelles tables : on les donne
-- explicitement, au strict nécessaire. La RLS filtre ensuite les lignes.
-- =============================================================

-- Visiteurs non connectés : aucun accès aux données.
revoke all on public.profiles, public.accounts, public.categories,
              public.transactions, public.exchange_rates, public.account_balances
  from anon;

-- Utilisateurs connectés
revoke all on public.profiles, public.accounts, public.categories,
              public.transactions, public.exchange_rates, public.account_balances
  from authenticated;

grant select, update                 on public.profiles         to authenticated;
grant select, insert, update, delete on public.accounts         to authenticated;
grant select, insert, update, delete on public.categories       to authenticated;
grant select, insert, update, delete on public.transactions     to authenticated;
grant select                         on public.exchange_rates   to authenticated;
grant select                         on public.account_balances to authenticated;
