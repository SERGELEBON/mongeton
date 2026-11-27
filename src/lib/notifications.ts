/**
 * Notifications locales (alertes de challenge). Aucune notification push serveur :
 * l'alerte est calculée sur le téléphone puis affichée immédiatement.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'challenges';
let configured = false;

async function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Challenges',
      importance: AndroidImportance.HIGH,
      lightColor: '#CCB068',
    });
  }
}

export async function notificationsGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await configure();
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function notifyNow(title: string, body: string): Promise<void> {
  if (!(await notificationsGranted())) return;
  try {
    await configure();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      trigger: null,
    });
  } catch {
    // Notification impossible (ex. Expo Go) : l'alerte reste visible dans l'app.
  }
}
