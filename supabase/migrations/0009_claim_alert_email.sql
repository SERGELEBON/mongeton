-- =============================================================
-- Mongeton — réservation atomique de l'envoi d'un email d'alerte.
-- Renvoie true une seule fois par alerte (même en cas d'appels simultanés),
-- uniquement pour une alerte appartenant à l'utilisateur connecté.
-- =============================================================
create or replace function public.claim_alert_email(p_alert_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.challenge_alerts
       set emailed_at = now()
     where id = p_alert_id
       and user_id = (select auth.uid())
       and emailed_at is null
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- Annule la réservation si l'envoi a échoué (pour réessayer plus tard).
create or replace function public.release_alert_email(p_alert_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.challenge_alerts
     set emailed_at = null
   where id = p_alert_id
     and user_id = (select auth.uid());
$$;

revoke all on function public.claim_alert_email(uuid), public.release_alert_email(uuid) from public, anon;
grant execute on function public.claim_alert_email(uuid), public.release_alert_email(uuid) to authenticated;
