import { applyBrandGuardian } from "./brand-guardian";
import {
  CarouselPlanSchema,
  ContentPlanSchema,
  ReelsPlanSchema,
  type BrandBrain,
  type CarouselPlan,
  type ContentPlan,
  type ReelsPlan,
} from "./domain";
import { demoPlan } from "./mock-data";

export type OrchestratorInput = {
  contentType: "REELS" | "CAROUSEL";
  topic?: string;
  objective?: ReelsPlan["objective"];
  variant?: number;
};

export type OrchestratorResult = {
  plan: ContentPlan;
  provider: "DETERMINISTIC_PHASE1";
  externalCall: false;
  promptVersion: "phase1-rule-v1";
};

const hooks = ["肩だけ揉んでない？", "朝の姿勢、最初の1分で整える", "がんばらない首・肩ケア"];

function createCarousel(input: OrchestratorInput): CarouselPlan {
  const topic = input.topic?.trim() || "朝の姿勢";
  const variant = Math.abs(input.variant ?? 0) % 3;
  return CarouselPlanSchema.parse({
    contentType: "CAROUSEL",
    id: `carousel-${topic}-${variant}`,
    version: 1,
    objective: input.objective ?? "TRUST",
    topic,
    hook: ["朝の姿勢を整える3つのヒント", "40代からの、やさしい姿勢習慣", "忙しい朝に1分だけ"][variant],
    slides: [
      { id: "c1", position: 1, heading: "朝の姿勢、がんばりすぎてない？", body: "力で正そうとせず、呼吸しやすい位置を探すところから始めます。", visualDirection: "余白のあるタイトル。自然光の立ち姿。" },
      { id: "c2", position: 2, heading: "1. 足裏を感じる", body: "左右どちらかに寄っていないか、静かに確かめます。", visualDirection: "足元のシンプルな線画。" },
      { id: "c3", position: 3, heading: "2. 息を長く吐く", body: "肩を下げようとせず、吐く息に合わせて力をゆるめます。", visualDirection: "呼吸の流れを小さな矢印で表示。" },
      { id: "c4", position: 4, heading: "3. 目線を遠くへ", body: "あごを引きすぎず、少し遠くを見る感覚で立ちます。", visualDirection: "横向きの上半身。目線を点線で示す。" },
      { id: "c5", position: 5, heading: "できる日だけ、やさしく", body: "完璧より、気づいたときに戻ることを大切に。", visualDirection: "ブランドカラーの保存案内。" },
    ],
    thumbnailOptions: ["朝の姿勢 3つのヒント", "がんばらない姿勢習慣", "朝1分の整え時間"],
    caption: `${topic}を整えようとして、かえって力が入っていませんか？\n\n今日は、足裏・呼吸・目線の3つをやさしく確認します。痛みや違和感のない範囲で、ご自身のペースで試してください。`,
    cta: "明日の朝に見返せるよう、保存しておいてくださいね。",
    safetyStatus: "PASS",
    safetyFlags: [],
    brandScore: 94,
    confidence: "LOW",
    sourceFactIds: ["brand-profile-concept", "brand-profile-tone"],
  });
}

function createReels(input: OrchestratorInput): ReelsPlan {
  const variant = Math.abs(input.variant ?? 0) % hooks.length;
  const topic = input.topic?.trim() || demoPlan.topic;
  return ReelsPlanSchema.parse({
    ...demoPlan,
    id: `reels-${topic}-${variant}`,
    objective: input.objective ?? demoPlan.objective,
    topic,
    hook: hooks[variant],
    version: 1,
  });
}

export function orchestrateContent(input: OrchestratorInput, brand?: BrandBrain): OrchestratorResult {
  const plan = input.contentType === "CAROUSEL" ? createCarousel(input) : createReels(input);
  return {
    plan: applyBrandGuardian(ContentPlanSchema.parse(plan), brand),
    provider: "DETERMINISTIC_PHASE1",
    externalCall: false,
    promptVersion: "phase1-rule-v1",
  };
}

export type RegeneratableSection = "HOOK" | "BODY" | "CAPTION" | "CTA";

export function regeneratePlanSection(plan: ContentPlan, section: RegeneratableSection, brand?: BrandBrain): ContentPlan {
  const nextVersion = plan.version + 1;
  let next: ContentPlan;
  if (plan.contentType === "REELS") {
    const index = nextVersion % hooks.length;
    next = ReelsPlanSchema.parse({
      ...plan,
      version: nextVersion,
      hook: section === "HOOK" ? hooks[index] : plan.hook,
      caption: section === "CAPTION" ? `${plan.caption}\n\n今日できた小さな変化も、大切にしてみてくださいね。` : plan.caption,
      cta: section === "CTA" ? "無理なく続けられそうなら、保存してまた一緒に試しましょう。" : plan.cta,
      scenes: section === "BODY" ? plan.scenes.map((scene, sceneIndex) => sceneIndex === 1 ? { ...scene, overlay: "呼吸と一緒に、やさしく" } : scene) : plan.scenes,
    });
  } else {
    next = CarouselPlanSchema.parse({
      ...plan,
      version: nextVersion,
      hook: section === "HOOK" ? "姿勢を正す前に、確かめたい3つ" : plan.hook,
      caption: section === "CAPTION" ? `${plan.caption}\n\n全部できなくても大丈夫。ひとつだけ選んでみてください。` : plan.caption,
      cta: section === "CTA" ? "気になった項目を、あとで見返せるよう保存してくださいね。" : plan.cta,
      slides: section === "BODY" ? plan.slides.map((slide, index) => index === 0 ? { ...slide, body: "まずは今の呼吸と立ち方に気づくところから始めます。" } : slide) : plan.slides,
    });
  }
  return applyBrandGuardian(next, brand);
}
