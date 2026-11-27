import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { CapturedNotification } from './MongetonNotifications.types';

declare class MongetonNotificationsModule extends NativeModule<{}> {
  isAccessGranted(): boolean;
  openAccessSettings(): void;
  getPending(): string;
  removePending(ids: string[]): void;
}

// Absent dans Expo Go et sur le web : l'app reste fonctionnelle, la fonction est juste indisponible.
const native = requireOptionalNativeModule<MongetonNotificationsModule>('MongetonNotifications');

export const isNotificationCaptureAvailable = native !== null;

export function isAccessGranted(): boolean {
  return native?.isAccessGranted() ?? false;
}

export function openAccessSettings(): void {
  native?.openAccessSettings();
}

export function getPendingNotifications(): CapturedNotification[] {
  if (!native) return [];
  try {
    return JSON.parse(native.getPending()) as CapturedNotification[];
  } catch {
    return [];
  }
}

export function removePendingNotifications(ids: string[]): void {
  if (ids.length) native?.removePending(ids);
}
