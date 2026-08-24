"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon } from "./icons";

const defaultShots = [
  { title: "Hook", duration: "2–3秒", direction: "胸から上・カメラ目線", line: "今日の自分に、やさしい1分。" },
  { title: "動きの説明", duration: "6–10秒", direction: "全身・縦位置を固定", line: "痛みのない範囲で、ゆっくり動きます。" },
  { title: "ポイント", duration: "5–8秒", direction: "手元または横から", line: "呼吸は止めず、肩の力を抜きます。" },
  { title: "まとめ", duration: "3–5秒", direction: "胸から上・自然な表情", line: "今日の体調に合わせて終えましょう。" },
];

export function ShootingAssistant({ batch = false }: { batch?: boolean }) {
  const [checked, setChecked] = useState<number[]>([]);
  const [script, setScript] = useState(defaultShots.map((shot) => shot.line).join("\n\n"));
  const [teleprompter, setTeleprompter] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const promptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running || !teleprompter) return;
    const timer = window.setInterval(() => { if (promptRef.current) promptRef.current.scrollTop += speed; }, 45);
    return () => window.clearInterval(timer);
  }, [running, speed, teleprompter]);

  const shoots = batch ? ["肩まわり", "呼吸", "寝る前セルフケア"] : ["今日のReels"];
  return <div className="page"><header className="pt-4 md:pt-0"><p className="eyebrow">PHASE 2 · SHOOTING</p><h1 className="title">{batch ? "まとめて撮影" : "撮影アシスタント"}</h1><p className="lead">迷わない順番で、無理のない範囲で撮影します。身体の状態を評価する機能ではありません。</p></header>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.8fr]"><section className="grid gap-5">{shoots.map((shoot, shootIndex) => <div key={shoot} className="card p-5 md:p-7"><div className="flex items-center justify-between"><h2 className="m-0 text-xl">{shoot}</h2><span className="pill">9:16 · 約30秒</span></div><div className="mt-5 grid gap-3">{defaultShots.map((shot, index) => { const key=shootIndex*10+index; const done=checked.includes(key); return <button type="button" key={shot.title} onClick={() => setChecked((items) => done ? items.filter((item)=>item!==key) : [...items,key])} className={`grid grid-cols-[2.7rem_1fr] gap-3 rounded-2xl border p-4 text-left ${done ? "border-[var(--sage)] bg-[var(--sage-soft)]" : "border-[var(--line)] bg-white"}`}><span className={`grid h-10 w-10 place-items-center rounded-full ${done ? "bg-[var(--sage)] text-white" : "bg-[var(--paper)]"}`}>{done ? <CheckIcon/> : index+1}</span><span><strong className="flex justify-between gap-2">{shot.title}<small>{shot.duration}</small></strong><small className="mt-1 block text-[var(--muted)]">{shot.direction}</small><span className="mt-2 block rounded-xl bg-[var(--paper)] p-2 text-sm">「{shot.line}」</span></span></button>; })}</div></div>)}</section>
      <aside className="grid content-start gap-4"><div className="soft-card p-5"><h2 className="mt-0 text-lg">撮る前の確認</h2><ul className="mb-0 space-y-2 text-sm"><li>レンズを拭き、縦向きで固定</li><li>顔と身体に均一な光</li><li>通知をOFF、静かな場所</li><li>痛みや違和感があれば中止</li><li>お客様素材は同意を確認</li></ul></div><div className="card p-5"><h2 className="mt-0 text-lg">テレプロンプター</h2><textarea rows={7} value={script} onChange={(event)=>setScript(event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-sm"/><button className="secondary mt-3 w-full" onClick={()=>{setTeleprompter(true);setRunning(false);}}>全画面で読む</button></div><Link href="/create/video" className="primary no-underline">撮影後、動画を編集する</Link>{!batch && <Link href="/create/batch" className="secondary no-underline">3本まとめて撮る</Link>}</aside></div>
    {teleprompter && <div className="fixed inset-0 z-[100] grid bg-[#202420] p-5 text-white md:p-10"><div className="mx-auto flex w-full max-w-4xl flex-col"><div className="flex flex-wrap items-center justify-between gap-3"><strong>TELEPROMPTER</strong><div className="flex gap-2"><label className="text-sm">速さ <input type="range" min="1" max="5" value={speed} onChange={(event)=>setSpeed(Number(event.target.value))}/></label><button className="secondary min-h-10" onClick={()=>setRunning((value)=>!value)}>{running ? "停止" : "開始"}</button><button className="secondary min-h-10" onClick={()=>{setTeleprompter(false);setRunning(false);}}>閉じる</button></div></div><div ref={promptRef} className="mt-6 flex-1 overflow-y-auto rounded-3xl border border-white/15 bg-black/20 px-[8vw] py-[38vh] text-center text-[clamp(2rem,7vw,5rem)] font-bold leading-[1.65] whitespace-pre-wrap">{script}</div></div></div>}
  </div>;
}
