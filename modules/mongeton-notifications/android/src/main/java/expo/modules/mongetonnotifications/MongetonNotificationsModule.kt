package expo.modules.mongetonnotifications

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MongetonNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MongetonNotifications")

    /** L'utilisateur a-t-il accordé « Accès aux notifications » à Mongeton ? */
    Function("isAccessGranted") {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners").orEmpty()
      val component = ComponentName(context, MongetonNotificationListener::class.java).flattenToString()
      enabled.split(":").any { it == component }
    }

    /** Ouvre l'écran système où l'utilisateur active l'accès. */
    Function("openAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Notifications financières en attente, au format JSON. */
    Function("getPending") {
      NotificationStore.readAll(context)
    }

    /** Retire de la file les notifications traitées (importées ou ignorées). */
    Function("removePending") { ids: List<String> ->
      NotificationStore.remove(context, ids)
    }
  }
}
