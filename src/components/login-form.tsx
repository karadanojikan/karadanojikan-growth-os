"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  return <form action={formAction} className="grid gap-4">
    <div><label htmlFor="email" className="text-sm font-bold">メールアドレス</label><input id="email" name="email" type="email" autoComplete="email" required disabled={!enabled || pending} className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4" /></div>
    <div><label htmlFor="password" className="text-sm font-bold">パスワード</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required disabled={!enabled || pending} className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4" /></div>
    {state.error && <p role="alert" className="m-0 rounded-xl bg-[var(--apricot-soft)] p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    <button type="submit" disabled={!enabled || pending} className="primary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? "確認中…" : "ログイン"}</button>
  </form>;
}
