import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireCurrentUser } from "@/lib/auth";
import { getAppMode } from "@/lib/runtime-config";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  if (getAppMode() === "demo") redirect("/");
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (data) redirect("/");
  return <div className="page grid min-h-[80vh] place-items-center"><section className="card w-full max-w-lg p-6 md:p-9"><span className="pill">FIRST SETUP</span><h1 className="mb-2 mt-5 text-3xl">最初の準備をしましょう</h1><p className="lead m-0">ワークスペースと、安全な初期Brand Brainを作成します。サービスや料金はここでは創作せず、あとから確認しながら登録します。</p><OnboardingForm /></section></div>;
}
