"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const WorkspaceNameSchema = z.string().trim().min(1, "名前を入力してください。").max(80, "80文字以内で入力してください。");
export type OnboardingState = { error: string | null };

export async function initializeWorkspace(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await requireCurrentUser();
  const name = WorkspaceNameSchema.safeParse(formData.get("workspaceName"));
  if (!name.success) return { error: name.error.issues[0]?.message ?? "入力内容を確認してください。" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("initialize_workspace", { p_name: name.data });
  if (error) return { error: "初期設定を保存できませんでした。すでに設定済みの場合は、ログインし直してください。" };
  redirect("/");
}
