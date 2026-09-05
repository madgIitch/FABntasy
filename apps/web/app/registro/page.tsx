import { AuthForm } from "../auth/auth-form";
import { register } from "../auth/actions";
export default function RegisterPage() { return <AuthForm mode="register" action={register} />; }
