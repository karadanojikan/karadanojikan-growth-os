import { BrandBrainSchema, type BrandBrain } from "./domain";

export const defaultBrandBrain: BrandBrain = BrandBrainSchema.parse({
  concept: "40代から、自分の身体をやさしく整え、毎日を軽やかに楽しむためのボディメイク",
  audience: "40代前後の女性",
  tone: ["優しい", "落ち着いている", "前向き", "信頼できる", "親しみやすい"],
  services: [],
  location: "UNKNOWN",
  reservationFlow: "UNKNOWN",
  approvedClaims: ["痛みや違和感のない範囲で、やさしく身体を動かす"],
  forbiddenClaims: ["必ず治る", "絶対改善", "身体への劣等感を煽る表現"],
  terminology: {},
  colors: ["sage", "apricot", "warm white"],
  fonts: ["Hiragino Sans", "Yu Gothic"],
  ctaStyle: "押し売りせず、保存・見返し・無理のない実践をやさしく案内する",
  postingRatios: { GROWTH: 0.6, TRUST: 0.2, LIFESTYLE: 0.1, CONVERSION: 0.1 },
  contentThemes: ["首・肩", "姿勢", "顔まわり", "セルフケア", "身体の動かし方", "ライフスタイル"],
  unknownFacts: ["サービス内容", "価格", "予約導線", "所在地の公開表記"],
  version: 1,
});

export function parseStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

export function parseStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
