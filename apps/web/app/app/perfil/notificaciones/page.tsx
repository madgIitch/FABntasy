import { PwaSettings } from "../pwa-settings";
import { SettingsPage } from "../settings-header";
export default function NotificationsPage() { return <SettingsPage title="Notificaciones"><PwaSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} section="notifications" /></SettingsPage>; }
