"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import { ProfileServiceError, USERNAME_PATTERN, normalizeUsername, updateUserProfile } from "../../../src/server/user-profile";
import { db } from "../../../src/server/db";

export type ProfileFormState = { status: "idle" | "error"; message: string };
const AVATAR_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function saveProfile(_: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const displayNameValue = String(formData.get("displayName") ?? "").trim();
  const displayName = displayNameValue || null;
  if (!USERNAME_PATTERN.test(username)) return { status: "error", message: "Usa entre 3 y 24 letras, números o guiones bajos." };
  if (displayName && displayName.length > 60) return { status: "error", message: "El nombre visible no puede superar 60 caracteres." };

  const avatar = formData.get("avatar");
  let newAvatarPath: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = AVATAR_TYPES.get(avatar.type);
    if (!extension || avatar.size > MAX_AVATAR_BYTES) return { status: "error", message: "El avatar debe ser JPG, PNG o WebP y ocupar como máximo 2 MB." };
    newAvatarPath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(newAvatarPath, avatar, { contentType: avatar.type, upsert: false });
    if (error) return { status: "error", message: "No pudimos guardar la imagen. Inténtalo de nuevo." };
  }

  const previous = newAvatarPath ? await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { avatarPath: true } }) : null;
  try {
    await updateUserProfile(user.id, { username, displayName, avatarPath: newAvatarPath });
  } catch (error) {
    if (newAvatarPath) await supabase.storage.from("avatars").remove([newAvatarPath]);
    if (error instanceof ProfileServiceError && error.code === "USERNAME_TAKEN") return { status: "error", message: "Ese nombre de usuario ya está ocupado." };
    if (error instanceof ProfileServiceError && error.code === "PROFILE_NOT_FOUND") return { status: "error", message: "No encontramos tu perfil. Vuelve a iniciar sesión." };
    return { status: "error", message: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }
  if (previous?.avatarPath && previous.avatarPath !== newAvatarPath) await supabase.storage.from("avatars").remove([previous.avatarPath]);
  redirect("/app/perfil");
}
