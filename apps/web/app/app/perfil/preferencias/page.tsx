import { AppearanceSettings } from "../appearance-settings";
import { PwaSettings } from "../pwa-settings";
import { SettingsPage } from "../settings-header";
export default function PreferencesPage() { return <SettingsPage title="Apariencia e idioma"><AppearanceSettings compact /><PwaSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} section="install" /></SettingsPage>; }
