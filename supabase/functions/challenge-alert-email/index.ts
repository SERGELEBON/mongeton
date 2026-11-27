// Supabase Edge Function — envoie l'alerte d'un challenge (80 % ou budget dépassé)
// par email (Resend) et/ou message Telegram, selon ce qui est configuré.
//
// Appelée par l'app avec la session de l'utilisateur : { alertId }.
// Toutes les lectures passent par le client « utilisateur » (RLS) : aucune clé admin.
// L'unicité de l'envoi est garantie par la fonction SQL claim_alert_email.
//
// Secrets à définir (Supabase > Edge Functions > Secrets) :
//   RESEND_API_KEY  clé API Resend (https://resend.com, gratuit jusqu'à 3 000 emails / mois)
//   MAIL_FROM       expéditeur, ex. "Mongeton <alertes@ton-domaine.com>"
//                   (sans domaine vérifié : "Mongeton <onboarding@resend.dev>", envoi limité
//                    à l'adresse du compte Resend)
//   TELEGRAM_BOT_TOKEN  (facultatif) jeton du bot : envoie aussi l'alerte sur Telegram
//                       aux utilisateurs qui ont relié leur compte
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const money = (n: number, currency: string, lang: string) => {
  const decimals = currency === 'XOF' ? 0 : 2;
  const value = n.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = ({ XOF: 'FCFA', GHS: 'GH₵', USD: '$', EUR: '€' } as Record<string, string>)[currency] ?? currency;
  return currency === 'XOF' || lang !== 'en' ? `${value} ${symbol}` : `${symbol}${value}`;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('MAIL_FROM') ?? 'Mongeton <onboarding@resend.dev>';
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!resendKey && !telegramToken) return Response.json({ error: 'not_configured' }, { status: 503 });

    const { alertId } = await req.json().catch(() => ({}));
    if (typeof alertId !== 'string') return Response.json({ error: 'invalid_body' }, { status: 400 });

    const supabase = ctx.supabase;
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    const email = userData?.user?.email;
    if (userError || !email) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const { data: alert, error } = await supabase
      .from('challenge_alerts')
      .select('id, level, spent, challenges(name, amount)')
      .eq('id', alertId)
      .single();
    if (error || !alert) return Response.json({ error: 'not_found' }, { status: 404 });

    // Réserve l'envoi : un seul email par alerte, même si l'app appelle deux fois.
    const { data: claimed, error: claimError } = await supabase.rpc('claim_alert_email', { p_alert_id: alertId });
    if (claimError) return Response.json({ error: 'claim_failed' }, { status: 500 });
    if (!claimed) return Response.json({ status: 'already_sent' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('base_currency, language, telegram_chat_id')
      .single();
    const lang = profile?.language === 'en' ? 'en' : 'fr';
    const currency = profile?.base_currency ?? 'XOF';
    const challenge = alert.challenges as unknown as { name: string; amount: number };
    const amount = Number(challenge.amount);
    const spent = Number(alert.spent);
    const percent = Math.round((spent / amount) * 100);
    const remaining = Math.max(0, amount - spent);
    const name = escapeHtml(challenge.name);
    const exceeded = alert.level === 'exceeded';
    const m = (n: number) => money(n, currency, lang);

    const t =
      lang === 'en'
        ? {
            subject: exceeded ? `Budget exceeded: ${challenge.name}` : `80% of your budget used: ${challenge.name}`,
            title: exceeded ? 'Budget exceeded' : 'Only 20% of your budget left',
            body: exceeded
              ? `You have spent <b>${m(spent)}</b> out of <b>${m(amount)}</b> planned for “${name}”.`
              : `You have used <b>${percent}%</b> of your “${name}” budget (${m(spent)} / ${m(amount)}). <b>${m(remaining)}</b> left.`,
            footer: 'You receive this email because you created a challenge in Mongeton.',
          }
        : {
            subject: exceeded ? `Budget dépassé : ${challenge.name}` : `80 % de ton budget utilisé : ${challenge.name}`,
            title: exceeded ? 'Budget dépassé' : 'Il reste moins de 20 % de ton budget',
            body: exceeded
              ? `Tu as dépensé <b>${m(spent)}</b> sur <b>${m(amount)}</b> prévus pour « ${name} ».`
              : `Tu as utilisé <b>${percent} %</b> de ton budget « ${name} » (${m(spent)} / ${m(amount)}). Il te reste <b>${m(remaining)}</b>.`,
            footer: 'Tu reçois cet email car tu as créé un challenge dans Mongeton.',
          };

    const html = `<!doctype html><html><body style="margin:0;background:#F6F4F0;font-family:Arial,sans-serif;color:#14211A">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #E6E1D6" cellpadding="0" cellspacing="0">
    <tr><td style="padding:28px 28px 8px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;border:5px solid #CCB068;margin:0 auto"></div>
      <div style="margin-top:12px;font-size:20px;letter-spacing:4px;color:#164C28;font-weight:bold">MONGETON</div>
    </td></tr>
    <tr><td style="padding:8px 28px 28px">
      <h2 style="margin:16px 0 8px;color:${exceeded ? '#C8413B' : '#A8843A'}">${t.title}</h2>
      <p style="font-size:15px;line-height:1.6;margin:0">${t.body}</p>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#5F6B63;margin-top:16px">${t.footer}</p>
</td></tr></table></body></html>`;

    const sent: string[] = [];
    const failures: string[] = [];

    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject: t.subject, html }),
      });
      if (res.ok) sent.push('email');
      else failures.push(`email: ${await res.text()}`);
    }

    if (telegramToken && profile?.telegram_chat_id) {
      // Le corps est déjà échappé (nom du challenge) : on ne garde que le gras, autorisé par Telegram.
      const plain = t.body;
      const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          text: `${exceeded ? '🔴' : '🟠'} <b>${escapeHtml(t.title)}</b>\n${plain}`,
          parse_mode: 'HTML',
        }),
      });
      if (res.ok) sent.push('telegram');
      else failures.push(`telegram: ${await res.text()}`);
    }

    if (!sent.length) {
      // Rien n'est parti : on libère la réservation pour pouvoir réessayer.
      await supabase.rpc('release_alert_email', { p_alert_id: alertId });
      return Response.json({ error: 'send_failed', failures }, { status: 502 });
    }
    return Response.json({ status: 'sent', channels: sent, failures });
  }),
};
