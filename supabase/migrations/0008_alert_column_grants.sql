-- =============================================================
-- Mongeton — l'app ne peut modifier que `read_at` sur une alerte.
-- `emailed_at` et `spent` ne sont écrits que par la fonction serveur.
-- =============================================================
revoke update on public.challenge_alerts from authenticated;
grant update (read_at) on public.challenge_alerts to authenticated;
