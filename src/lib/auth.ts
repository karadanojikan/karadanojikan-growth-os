import "server-only";
import { redirect } from "next/navigation";
import { getAppMode } from "./runtime-config";
import { createClient } from "./supabase/server";

export async function getCurrentUser() {
  if (getAppMode() === "demo") return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
