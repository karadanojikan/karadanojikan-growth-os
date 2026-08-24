"use client";
import { useMemo, useSyncExternalStore } from "react";
import { ContentPlanSchema, type ContentPlan } from "@/lib/domain";

type Draft = { plan: ContentPlan; scheduledFor: string };
const storageKey = "karadanojikan.phase1.drafts";
const empty = "[]";
function subscribe(callback: () => void) { window.addEventListener("storage", callback); return () => window.removeEventListener("storage", callback); }
function snapshot() { return window.localStorage.getItem(storageKey) ?? empty; }
function serverSnapshot() { return empty; }

export function DemoDrafts() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const drafts = useMemo(() => { try { const rows=JSON.parse(raw) as Array<{plan:unknown;scheduledFor:string}>; return rows.flatMap((item):Draft[]=>{const plan=ContentPlanSchema.safeParse(item.plan);return plan.success?[{plan:plan.data,scheduledFor:item.scheduledFor}]:[]}); } catch { return []; } }, [raw]);
  if (!drafts.length) return null;
  return <section className="mt-6"><h2 className="text-lg">この端末に保存した下書き</h2><div className="grid gap-3">{drafts.map((draft,index)=><article key={`${draft.plan.id}-${index}`} className="card flex items-center gap-4 p-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[var(--apricot-soft)] text-xs font-bold">{draft.plan.contentType}</div><div className="min-w-0 flex-1"><span className="pill">下書き</span><h3 className="mb-0 mt-2 truncate">{draft.plan.hook}</h3></div><time className="text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("ja-JP",{month:"numeric",day:"numeric",timeZone:"Asia/Tokyo"}).format(new Date(draft.scheduledFor))}</time></article>)}</div></section>;
}
