/** Notification financière captée par le service Android. */
export type CapturedNotification = {
  id: string;
  /** Application d'origine (ex. com.android.messaging pour un SMS, app MoMo…). */
  package: string;
  title: string;
  text: string;
  /** Horodatage en millisecondes. */
  postedAt: number;
};
