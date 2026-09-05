type AuthErrorLike = {
  code?: string;
  status?: number;
};

export function registrationErrorMessage(error: AuthErrorLike): string {
  switch (error.code) {
    case "email_address_not_authorized":
      return "El servicio de correo aún no está configurado para esta dirección. Usa un correo del equipo de Supabase o configura un SMTP propio.";
    case "over_email_send_rate_limit":
      return "Se ha alcanzado el límite temporal de correos. Espera unos minutos o configura un SMTP propio.";
    case "email_address_invalid":
      return "La dirección o el proveedor de correo no son válidos.";
    case "weak_password":
      return "La contraseña no cumple los requisitos de seguridad.";
    case "signup_disabled":
      return "El registro está desactivado temporalmente.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con este correo. Inicia sesión o restablece la contraseña.";
    default:
      return "No se pudo completar el registro. Espera un momento e inténtalo de nuevo.";
  }
}

export function authErrorLog(error: AuthErrorLike) {
  return {
    code: error.code ?? "unknown",
    status: error.status ?? null,
  };
}
