// Supabase Edge Function — webhook du bot Telegram Mongeton.
// Reçoit « /start <code> » quand l'utilisateur ouvre le lien depuis l'app,
// et relie son chat Telegram à son profil (fonction SQL link_telegram).
//
// Secrets requis (Supabase > Edge Functions > Secrets) :
//   TELEGRAM_BOT_TOKEN       jeton donné par @BotFather
//   TELEGRAM_WEBHOOK_SECRET  chaîne aléatoire, aussi passée à setWebhook (secret_token)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const send = (token: string, chatId: number, text: string) =>
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    // Seul Telegram connaît ce secret : toute autre requête est rejetée.
    if (!token || !secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) {
      return new Response('forbidden', { status: 403 });
    }

    const update = await req.json().catch(() => null);
    const message = update?.message;
    const chatId: number | undefined = message?.chat?.id;
    const text: string = message?.text ?? '';
    if (!chatId) return new Response('ok');

    const code = text.startsWith('/start ') ? text.slice(7).trim() : '';
    if (!code) {
      await send(
        token,
        chatId,
        'Bonjour 👋 Pour recevoir tes alertes Mongeton ici, ouvre l’app : <b>Réglages → Telegram → Relier</b>.\n\nHi 👋 To get your Mongeton alerts here, open the app: <b>Settings → Telegram → Link</b>.'
      );
      return new Response('ok');
    }

    const { data: linked } = await ctx.supabase.rpc('link_telegram', { p_code: code, p_chat_id: chatId });
    await send(
      token,
      chatId,
      linked
        ? '✅ Telegram relié à Mongeton. Tu recevras ici tes alertes de challenge (80 % du budget et dépassement).\n\n✅ Telegram linked to Mongeton. Your challenge alerts will arrive here.'
        : '⚠️ Lien expiré ou invalide. Réessaie depuis l’app : Réglages → Telegram.\n\n⚠️ Expired or invalid link. Try again from the app: Settings → Telegram.'
    );
    return new Response('ok');
  }),
};
