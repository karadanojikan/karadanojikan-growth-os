import { ReelsPlanSchema, type ReelsPlan } from "./domain";

export const todayRecommendation = {
  topic: "肩だけ揉んでない？",
  description: "首と肩を一緒にゆるめる、25秒のセルフケアReels",
  reasons: ["首肩投稿の保存率が平均より高い", "直近2投稿で肩テーマを扱っていない", "新規の方に届く投稿比率が不足している"],
  confidence: "MEDIUM" as const,
};

export const demoPlan: ReelsPlan = ReelsPlanSchema.parse({
  id: "demo-reel-shoulder-001", version: 1, objective: "GROWTH", topic: "首・肩セルフケア",
  hook: "肩だけ揉んでない？", targetDurationSeconds: 25,
  scenes: [
    { id: "s1", startSeconds: 0, endSeconds: 3, visual: "正面、肩に手を置いてカメラを見る", overlay: "肩だけ揉んでない？" },
    { id: "s2", startSeconds: 3, endSeconds: 17, visual: "首の付け根から肩へ、やさしく動かす", overlay: "首と肩は一緒にゆるめる" },
    { id: "s3", startSeconds: 17, endSeconds: 22, visual: "深呼吸しながら肩を下げる", overlay: "痛くない範囲でゆっくり" },
    { id: "s4", startSeconds: 22, endSeconds: 25, visual: "自然な笑顔で締める", overlay: "あとでできるように保存" },
  ],
  shotList: [
    { id: "sh1", label: "Hook", durationSeconds: 3, cameraDirection: "正面・胸から上", spokenLine: "肩だけ、ずっと揉んでいませんか？" },
    { id: "sh2", label: "セルフケア", durationSeconds: 14, cameraDirection: "斜め45度・手元が見える距離", spokenLine: "首の付け根から肩を、痛くない範囲でゆっくり動かします。" },
    { id: "sh3", label: "呼吸", durationSeconds: 5, cameraDirection: "横・肩の上下が見える", spokenLine: "息を吐きながら、肩の力をふっと抜きましょう。" },
    { id: "sh4", label: "CTA", durationSeconds: 3, cameraDirection: "正面", spokenLine: "あとで一緒にできるよう、保存しておいてくださいね。" },
  ],
  thumbnailOptions: ["肩だけ揉んでない？", "首と肩を一緒に整える", "40代からの肩ケア"],
  caption: "肩が気になると、つい肩だけを揉みたくなりますよね。\n\n今日は首の付け根から肩までを、呼吸に合わせてやさしく動かします。痛くない範囲で、ゆっくり試してみてください。\n\n※強い痛みや違和感がある場合は無理に行わず、専門家へご相談ください。",
  cta: "あとで試せるように保存しておいてくださいね。",
  safetyStatus: "PASS", safetyFlags: [], brandScore: 96, confidence: "MEDIUM", sourceFactIds: ["brand-tone-01", "claim-gentle-movement-01"],
});

export const contentBank = [
  { id: "1", status: "READY", type: "Reels", title: "肩だけ揉んでない？", theme: "首・肩", date: "8/26" },
  { id: "2", status: "PLANNED", type: "Carousel", title: "朝の姿勢を整える3つのヒント", theme: "姿勢", date: "8/29" },
  { id: "3", status: "IDEA", type: "Reels", title: "顔まわりをすっきり見せる呼吸", theme: "顔まわり", date: "未定" },
];
