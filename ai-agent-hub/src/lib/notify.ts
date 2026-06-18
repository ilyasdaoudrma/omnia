// On-device notifications for order/ride/booking status. (Real server push would
// need a push service + VAPID keys + subscription storage — out of scope here;
// this fires local notifications on the user's device after their own actions.)

export async function ensureNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notify(title: string, body?: string): void {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/logo-eye.jpg', badge: '/logo-eye.jpg' });
  } catch {
    /* ignore */
  }
}
