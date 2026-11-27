#!/usr/bin/env bash
# Branche le bot Telegram Mongeton sur la fonction Supabase « telegram-webhook ».
# À lancer UNE fois, après avoir créé le bot avec @BotFather et ajouté les secrets
# TELEGRAM_BOT_TOKEN et TELEGRAM_WEBHOOK_SECRET dans Supabase.
#
#   bash scripts/telegram-setup.sh
#
# Le jeton est saisi en mode masqué : il n'est ni affiché ni enregistré.
set -euo pipefail

SUPABASE_URL="https://imyplenkwmnmdgqrddfd.supabase.co"
SECRET_FILE="$HOME/.mongeton/telegram-webhook-secret.txt"

[ -f "$SECRET_FILE" ] || { echo "✖ $SECRET_FILE introuvable."; exit 1; }
SECRET=$(tr -d '\n' < "$SECRET_FILE")

read -r -s -p "Jeton du bot (donné par @BotFather) : " TOKEN; echo
[ -n "$TOKEN" ] || { echo "✖ Jeton vide."; exit 1; }
API="https://api.telegram.org/bot${TOKEN}"

BOT=$(curl -fsS "$API/getMe" | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["username"])') \
  || { echo "✖ Jeton refusé par Telegram."; exit 1; }

curl -fsS "$API/setWebhook" \
  --data-urlencode "url=${SUPABASE_URL}/functions/v1/telegram-webhook" \
  --data-urlencode "secret_token=${SECRET}" \
  --data-urlencode 'allowed_updates=["message"]' >/dev/null

curl -fsS "$API/setMyDescription" \
  --data-urlencode "description=Alertes de budget Mongeton : reçois ici un message quand tu atteins 80 % de ton challenge. / Mongeton budget alerts." >/dev/null

echo "✔ Webhook enregistré pour @${BOT}."
curl -fsS "$API/getWebhookInfo" | python3 -c '
import sys, json
r = json.load(sys.stdin)["result"]
print("  URL :", r.get("url"))
print("  Erreur récente :", r.get("last_error_message", "aucune"))'
echo
echo "Nom public du bot à renseigner dans l'app (EXPO_PUBLIC_TELEGRAM_BOT) : ${BOT}"
