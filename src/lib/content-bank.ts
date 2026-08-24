import "server-only";
import { contentBank as demoContentBank } from "./mock-data";
import { getAppMode, isSupabaseConfigured } from "./runtime-config";
import { createClient } from "./supabase/server";

export type ContentBankItem = { id: string; status: string; type: string; title: string; theme: string; date: string };

export async function getContentBank(): Promise<ContentBankItem[]> {
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return demoContentBank;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id,status,content_type,topic,scheduled_for")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("コンテンツバンクを取得できませんでした。");
  return data.map((item) => ({
    id: item.id,
    status: item.status,
    type: item.content_type === "REELS" ? "Reels" : item.content_type,
    title: item.topic,
    theme: item.topic,
    date: item.scheduled_for ? new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(item.scheduled_for)) : "未定",
  }));
}
