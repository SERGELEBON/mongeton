package expo.modules.mongetonnotifications

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * File d'attente locale (SharedPreferences) des notifications financières captées.
 * Rien ne quitte le téléphone ici : l'app lit la file, propose les opérations à
 * l'utilisateur, puis retire celles qu'il a traitées.
 */
internal object NotificationStore {
  private const val PREFS = "mongeton_notifications"
  private const val KEY = "pending"
  private const val MAX_ITEMS = 300

  @Synchronized
  fun append(context: Context, pkg: String, title: String, text: String, postedAt: Long) {
    val items = read(context)
    val id = "$pkg:$postedAt:${(title + text).hashCode()}"
    for (i in 0 until items.length()) {
      if (items.getJSONObject(i).optString("id") == id) return
    }
    items.put(
      JSONObject()
        .put("id", id)
        .put("package", pkg)
        .put("title", title)
        .put("text", text)
        .put("postedAt", postedAt)
    )
    // On garde les plus récentes si la file déborde.
    val trimmed = JSONArray()
    val start = maxOf(0, items.length() - MAX_ITEMS)
    for (i in start until items.length()) trimmed.put(items.get(i))
    write(context, trimmed)
  }

  @Synchronized
  fun readAll(context: Context): String = read(context).toString()

  @Synchronized
  fun remove(context: Context, ids: List<String>) {
    val toRemove = ids.toSet()
    val items = read(context)
    val kept = JSONArray()
    for (i in 0 until items.length()) {
      val item = items.getJSONObject(i)
      if (item.optString("id") !in toRemove) kept.put(item)
    }
    write(context, kept)
  }

  private fun read(context: Context): JSONArray {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return JSONArray()
    return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
  }

  private fun write(context: Context, items: JSONArray) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, items.toString()).apply()
  }
}
