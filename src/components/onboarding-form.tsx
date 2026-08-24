"use client";

import { useActionState } from "react";
import { initializeWorkspace, type OnboardingState } from "@/app/onboarding/actions";

const initialState: OnboardingState = { error: null };
export function OnboardingForm() {
  const [state, action, pending] = useActionState(initializeWorkspace, initialState);
  return <form action={action} className="mt-6 grid gap-4"><div><label htmlFor="workspaceName" className="text-sm font-bold">運用するブランド名</label><input id="workspaceName" name="workspaceName" defaultValue="からだのじかん" required maxLength={80} disabled={pending} className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4" /></div>{state.error && <p role="alert" className="m-0 rounded-xl bg-[var(--apricot-soft)] p-3 text-sm text-[var(--danger)]">{state.error}</p>}<button type="submit" disabled={pending} className="primary w-full">{pending ? "準備中…" : "はじめる"}</button></form>;
}
