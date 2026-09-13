import { FeedbackForm } from "../../../../src/components/feedback-form";
import { SettingsPage } from "../settings-header";

export default function FeedbackPage(){return <SettingsPage title="Enviar feedback"><p>Este canal está separado de los registros técnicos. No incluyas contraseñas ni datos personales.</p><FeedbackForm/></SettingsPage>}
