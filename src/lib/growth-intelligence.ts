import { z } from "zod";
import { insightConfidence } from "./domain";

export const DirectMetricsSchema = z.object({
  reach: z.number().nonnegative().optional(),
  views: z.number().nonnegative().optional(),
  likes: z.number().nonnegative().optional(),
  comments: z.number().nonnegative().optional(),
  saved: z.number().nonnegative().optional(),
  shares: z.number().nonnegative().optional(),
  follows: z.number().nonnegative().optional(),
  profile_visits: z.number().nonnegative().optional(),
}).strict();
export type DirectMetrics = z.infer<typeof DirectMetricsSchema>;

export type MeasuredPost = {
  id: string;
  externalMediaId: string;
  mediaProductType: string;
  caption: string | null;
  permalink: string | null;
  publishedAt: string;
  capturedAt: string;
  measurementWindow: string;
  metrics: DirectMetrics;
};

export type AccountSnapshot = { capturedAt: string; followersCount: number | null };
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type Attribution = "DIRECT" | "ACCOUNT_LEVEL" | "ESTIMATED" | "UNKNOWN";

const metricNames = DirectMetricsSchema.keyof().options;

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (value && typeof value === "object" && "value" in value) return numericValue((value as { value: unknown }).value);
  return null;
}

export function normalizeMetaInsightData(raw: unknown): DirectMetrics {
  const parsed = z.object({ data: z.array(z.object({
    name: z.string(),
    values: z.array(z.object({ value: z.unknown() })).optional(),
    total_value: z.unknown().optional(),
  })) }).safeParse(raw);
  if (!parsed.success) return {};
  const normalized: Record<string, number> = {};
  for (const item of parsed.data.data) {
    if (!metricNames.includes(item.name as typeof metricNames[number])) continue;
    const value = numericValue(item.total_value) ?? numericValue(item.values?.at(-1)?.value);
    if (value !== null) normalized[item.name] = value;
  }
  return DirectMetricsSchema.parse(normalized);
}

export function measurementWindowFor(publishedAt: string, now = new Date()) {
  const ageHours = Math.max(0, (now.getTime() - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours < 24) return "EARLY";
  if (ageHours < 72) return "24H";
  if (ageHours < 168) return "72H";
  return "7D";
}

function sum(posts: MeasuredPost[], metric: keyof DirectMetrics) {
  return posts.reduce((total, post) => total + (post.metrics[metric] ?? 0), 0);
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function formatLabel(value: string) {
  if (value === "REELS") return "Reels";
  if (value === "FEED") return "フィード";
  if (value === "STORY") return "Stories";
  return value === "UNKNOWN" ? "形式不明" : value;
}

function ngrams(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const grams = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) grams.add(normalized.slice(index, index + 2));
  return grams;
}

export function textSimilarity(left: string, right: string) {
  const a = ngrams(left); const b = ngrams(right);
  if (a.size < 3 || b.size < 3) return 0;
  let overlap = 0;
  for (const value of a) if (b.has(value)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function tokyoDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function periodBounds(periodType: "WEEKLY" | "MONTHLY", now: Date) {
  const currentKey = tokyoDateKey(now);
  const [year, month, day] = currentKey.split("-").map(Number) as [number, number, number];
  const localDate = new Date(Date.UTC(year, month - 1, day));
  let start: Date;
  if (periodType === "WEEKLY") {
    const mondayOffset = (localDate.getUTCDay() + 6) % 7;
    start = new Date(localDate); start.setUTCDate(start.getUTCDate() - mondayOffset);
  } else start = new Date(Date.UTC(year, month - 1, 1));
  return { start: start.toISOString().slice(0, 10), end: currentKey };
}

export function buildPeriodReview(posts: MeasuredPost[], periodType: "WEEKLY" | "MONTHLY", now = new Date()) {
  const bounds = periodBounds(periodType, now);
  const periodPosts = posts.filter((post) => {
    const key = tokyoDateKey(new Date(post.publishedAt));
    return key >= bounds.start && key <= bounds.end;
  });
  const reach = sum(periodPosts, "reach");
  const saves = sum(periodPosts, "saved");
  const shares = sum(periodPosts, "shares");
  const confidence = insightConfidence(periodPosts.length);
  const ranked = [...periodPosts].sort((a, b) => ((b.metrics.saved ?? 0) + (b.metrics.shares ?? 0)) - ((a.metrics.saved ?? 0) + (a.metrics.shares ?? 0)));
  return {
    periodType,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    sampleSize: periodPosts.length,
    confidence,
    results: { reach, saves, shares },
    winnerMediaId: ranked[0]?.externalMediaId ?? null,
    learning: periodPosts.length >= 6
      ? "保存・シェアの実測値が高い形式を候補として次の1変数実験で検証します。因果関係は断定しません。"
      : "結論を出すには投稿数が不足しています。まず同じ基準で測定できる投稿を増やします。",
  };
}

export function buildGrowthIntelligence(posts: MeasuredPost[], accountSnapshots: AccountSnapshot[] = [], now = new Date()) {
  const sampleSize = posts.length;
  const confidence = insightConfidence(sampleSize);
  const reach = sum(posts, "reach");
  const likes = sum(posts, "likes");
  const comments = sum(posts, "comments");
  const saves = sum(posts, "saved");
  const shares = sum(posts, "shares");
  const views = sum(posts, "views");
  const engagement = likes + comments + saves + shares;

  const snapshots = [...accountSnapshots].filter((item) => item.followersCount !== null).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const followerGrowth = snapshots.length >= 2
    ? Math.max(0, (snapshots.at(-1)?.followersCount ?? 0) - (snapshots.at(-2)?.followersCount ?? 0))
    : null;

  const byFormat = new Map<string, MeasuredPost[]>();
  for (const post of posts) byFormat.set(post.mediaProductType, [...(byFormat.get(post.mediaProductType) ?? []), post]);
  const formats = [...byFormat].map(([name, items]) => {
    const formatReach = sum(items, "reach");
    const highIntent = sum(items, "saved") + sum(items, "shares");
    return { name, label: formatLabel(name), sampleSize: items.length, reach: formatReach, highIntent, rate: rate(highIntent, formatReach) };
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const topFormat = formats[0] ?? null;

  const datedPosts = posts.map((post) => ({ post, ageDays: (now.getTime() - new Date(post.publishedAt).getTime()) / 86_400_000 }));
  const reusable = datedPosts
    .filter(({ post, ageDays }) => ageDays >= 14 && (post.metrics.reach ?? 0) > 0)
    .map(({ post }) => ({ post, score: ((post.metrics.saved ?? 0) + (post.metrics.shares ?? 0)) / (post.metrics.reach ?? 1) }))
    .sort((a, b) => b.score - a.score)[0] ?? null;

  const duplicates: Array<{ leftId: string; rightId: string; similarity: number }> = [];
  for (let left = 0; left < posts.length; left += 1) for (let right = left + 1; right < posts.length; right += 1) {
    const a = posts[left]; const b = posts[right];
    if (!a?.caption || !b?.caption) continue;
    const similarity = textSimilarity(a.caption, b.caption);
    if (similarity >= .62) duplicates.push({ leftId: a.externalMediaId, rightId: b.externalMediaId, similarity });
  }
  duplicates.sort((a, b) => b.similarity - a.similarity);

  const enoughForPattern = sampleSize >= 6 && topFormat && topFormat.sampleSize >= 2 && topFormat.rate !== null;
  const whatHappened = sampleSize === 0
    ? "まだ測定済み投稿がありません。"
    : enoughForPattern
      ? `${topFormat.label}の保存＋シェア率が、測定した形式の中で最も高い状態です。`
      : `${sampleSize}件の投稿を測定しましたが、形式別の傾向を判断するには標本が不足しています。`;
  const whyItMayHaveHappened = enoughForPattern
    ? "形式との関連は観測できましたが、テーマ・投稿日・フォロワー構成なども影響し得るため原因とは断定できません。"
    : "比較条件が揃っていないため、理由はUNKNOWNです。";
  const nextTest = enoughForPattern
    ? `${topFormat.label}で内容を揃え、Hookだけを「質問型」と「意外性型」に変えるContent Experimentを各3件以上試します。`
    : "まず6件以上を同じ指標で測定し、その後にHookだけを変えるContent Experimentを提案します。";

  return {
    sampleSize,
    confidence,
    totals: { reach, views, likes, comments, saves, shares, engagement },
    rates: { saveRate: rate(saves, reach), shareRate: rate(shares, reach), engagementRate: rate(engagement, reach) },
    funnel: [
      { key: "reach", label: "リーチ", value: reach, attribution: "DIRECT" as Attribution },
      { key: "engagement", label: "反応", value: engagement, attribution: "DIRECT" as Attribution },
      { key: "followers", label: "フォロー増加", value: followerGrowth, attribution: followerGrowth === null ? "UNKNOWN" as Attribution : "ACCOUNT_LEVEL" as Attribution },
      { key: "dm", label: "DM", value: null, attribution: "UNKNOWN" as Attribution },
      { key: "reservation", label: "予約問い合わせ", value: null, attribution: "UNKNOWN" as Attribution },
      { key: "booking", label: "予約完了", value: null, attribution: "UNKNOWN" as Attribution },
    ],
    formats,
    insight: { whatHappened, whyItMayHaveHappened, confidence, nextTest },
    experiment: {
      title: "Hook 1変数テスト",
      hypothesis: enoughForPattern ? `${topFormat.label}ではHookの違いが保存＋シェア率に関連する可能性がある。` : "Hookの違いが保存＋シェア率に関連するかを確認する。",
      variable: "Hook",
      variantA: "質問型Hook",
      variantB: "意外性型Hook",
      primaryMetric: "(保存 + シェア) / リーチ",
      minimumSampleSize: 6,
    },
    reuseCandidate: reusable ? { mediaId: reusable.post.externalMediaId, permalink: reusable.post.permalink, score: reusable.score, attribution: "DIRECT" as Attribution } : null,
    duplicateWarnings: duplicates.slice(0, 3),
    recommendation: {
      title: enoughForPattern ? `${topFormat.label}を候補に、Hookだけを変えて検証` : "測定対象を6件以上まで増やす",
      rationale: enoughForPattern ? `${topFormat.sampleSize}件の${topFormat.label}実測値に基づく提案です。自動で戦略や投稿は変更しません。` : "小標本への過剰適合を避けるため、現時点では形式を断定しません。",
      confidence,
      attribution: enoughForPattern ? "DIRECT" as Attribution : "UNKNOWN" as Attribution,
    },
    weeklyReview: buildPeriodReview(posts, "WEEKLY", now),
    monthlyReview: buildPeriodReview(posts, "MONTHLY", now),
  };
}
