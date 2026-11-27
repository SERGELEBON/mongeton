package expo.modules.mongetonnotifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Service système appelé à chaque notification (même app fermée), une fois que
 * l'utilisateur a autorisé « Accès aux notifications » pour Mongeton.
 * Ne conserve que les notifications qui ressemblent à une opération financière.
 */
class MongetonNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) return
    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
    if (!FinancialFilter.matches("$title $text")) return
    NotificationStore.append(applicationContext, sbn.packageName, title, text, sbn.postTime)
  }
}

/** Filtre côté natif : on ne stocke jamais les notifications sans rapport avec l'argent. */
internal object FinancialFilter {
  private val money = Regex("""(?i)\d[\d\s.,]*\s*(fcfa|f\s?cfa|xof|cfa|ghs|gh₵|ghc|cedis?)\b|(?i)\b(fcfa|xof|ghs|gh₵|ghc)\s*\d""")
  private val providers = Regex("""(?i)\b(momo|mobile\s?money|orange\s?money|wave|moov|flooz|telecel|airteltigo)\b""")

  fun matches(content: String): Boolean = money.containsMatchIn(content) ||
    (providers.containsMatchIn(content) && Regex("""\d""").containsMatchIn(content))
}
