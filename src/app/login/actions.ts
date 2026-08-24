"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppMode, isSupabaseConfigured } from "@/lib/runtime-config";
import { createClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().trim().email("メールアドレスを確認してください。"),
  password: z.string().min(8, "パスワードは8文字以上です。").max(128),
});

export type LoginState = { error: string | null };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  if (getAppMode() !== "real" || !isSupabaseConfigured()) {
    return { error: "現在はDemo Modeです。Real Modeの設定後にログインできます。" };
  }

  const input = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!input.success) return { error: input.error.issues[0]?.message ?? "入力内容を確認してください。" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) return { error: "ログインできませんでした。メールアドレスまたはパスワードを確認してください。" };
  redirect("/onboarding");
}

export async function logout() {
  if (getAppMode() === "real" && isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
