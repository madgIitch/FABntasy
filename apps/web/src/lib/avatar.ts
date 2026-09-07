import { getSupabaseEnv } from "./supabase/env";

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/avatars/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function profileInitial(username: string | null | undefined, displayName: string | null | undefined) {
  return (displayName?.trim() || username?.trim() || "C").charAt(0).toUpperCase();
}
