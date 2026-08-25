import { z } from "zod";
import { INSTAGRAM_SCOPES, MetaContainerStatusSchema, PublishMediaSchema, type PublishMedia } from "./instagram-domain";

const ShortTokenSchema = z.object({
  access_token: z.string().min(1),
  user_id: z.union([z.string(), z.number()]).transform(String),
  permissions: z.union([z.string(), z.array(z.string())]).transform((value) => typeof value === "string" ? value.split(",").filter(Boolean) : value),
});
const ShortTokenResponseSchema = z.union([ShortTokenSchema, z.object({ data: z.array(ShortTokenSchema).min(1) })]).transform((value) => "data" in value ? value.data[0]! : value);
const LongTokenSchema = z.object({ access_token: z.string().min(1), token_type: z.string(), expires_in: z.number().int().positive() });
const ProfileSchema = z.object({
  user_id: z.union([z.string(), z.number()]).transform(String),
  username: z.string().min(1),
  account_type: z.string().transform((value) => value.toUpperCase()),
  profile_picture_url: z.string().url().optional(),
});
const ProfileResponseSchema = z.union([ProfileSchema, z.object({ data: z.array(ProfileSchema).min(1) })]).transform((value) => "data" in value ? value.data[0]! : value);
const IdSchema = z.object({ id: z.union([z.string(), z.number()]).transform(String) });
const OwnedMediaSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  caption: z.string().max(10000).optional(),
  media_type: z.string().optional(),
  media_product_type: z.string().optional(),
  permalink: z.string().url().optional(),
  timestamp: z.string().optional(),
});
const OwnedMediaPageSchema = z.object({
  data: z.array(OwnedMediaSchema),
  paging: z.object({ cursors: z.object({ before: z.string().optional(), after: z.string().optional() }).optional() }).optional(),
});
const AccountSnapshotSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  followers_count: z.number().int().nonnegative().optional(),
  follows_count: z.number().int().nonnegative().optional(),
  media_count: z.number().int().nonnegative().optional(),
});

export class MetaApiError extends Error {
  constructor(readonly status: number, readonly code: number | undefined, message: string, readonly requestId?: string) {
    super(message);
    this.name = "MetaApiError";
  }
}

type FetchLike = typeof fetch;

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || payload.error) {
    const error = (payload.error ?? payload) as Record<string, unknown>;
    throw new MetaApiError(response.status, typeof error.code === "number" ? error.code : undefined, typeof error.message === "string" ? error.message : "Meta API request failed.", response.headers.get("x-fb-trace-id") ?? undefined);
  }
  return payload;
}

export function buildInstagramAuthorizationUrl(input: { appId: string; redirectUri: string; state: string; scopes?: readonly string[] }) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (input.scopes ?? INSTAGRAM_SCOPES).join(","));
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeAuthorizationCode(input: { appId: string; appSecret: string; redirectUri: string; code: string }, fetcher: FetchLike = fetch) {
  const form = new FormData();
  form.set("client_id", input.appId);
  form.set("client_secret", input.appSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", input.redirectUri);
  form.set("code", input.code.replace(/#_$/, ""));
  const response = await fetcher("https://api.instagram.com/oauth/access_token", { method: "POST", body: form, cache: "no-store" });
  return ShortTokenResponseSchema.parse(await parseResponse(response));
}

export async function exchangeLongLivedToken(input: { appSecret: string; accessToken: string }, fetcher: FetchLike = fetch) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("access_token", input.accessToken);
  return LongTokenSchema.parse(await parseResponse(await fetcher(url, { cache: "no-store" })));
}

export async function refreshLongLivedToken(accessToken: string, fetcher: FetchLike = fetch) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  return LongTokenSchema.parse(await parseResponse(await fetcher(url, { cache: "no-store" })));
}

export class MetaInstagramClient {
  constructor(private readonly accessToken: string, private readonly apiVersion: string, private readonly fetcher: FetchLike = fetch) {}

  private async request(path: string, init?: RequestInit) {
    const response = await this.fetcher(`https://graph.instagram.com/${this.apiVersion}${path}`, {
      ...init,
      cache: "no-store",
      headers: { authorization: `Bearer ${this.accessToken}`, "content-type": "application/json", ...init?.headers },
    });
    return parseResponse(response);
  }

  async getProfile() {
    return ProfileResponseSchema.parse(await this.request("/me?fields=user_id,username,account_type,profile_picture_url"));
  }

  async createContainer(accountId: string, body: Record<string, unknown>) {
    return IdSchema.parse(await this.request(`/${encodeURIComponent(accountId)}/media`, { method: "POST", body: JSON.stringify(body) })).id;
  }

  async getContainerStatus(containerId: string) {
    const response = z.object({ status_code: MetaContainerStatusSchema }).parse(await this.request(`/${encodeURIComponent(containerId)}?fields=status_code`));
    return response.status_code;
  }

  async publishContainer(accountId: string, containerId: string) {
    return IdSchema.parse(await this.request(`/${encodeURIComponent(accountId)}/media_publish`, { method: "POST", body: JSON.stringify({ creation_id: containerId }) })).id;
  }

  async getPublishedMedia(mediaId: string) {
    return z.object({ id: z.string(), permalink: z.string().url().optional(), timestamp: z.string().optional() }).parse(await this.request(`/${encodeURIComponent(mediaId)}?fields=id,permalink,timestamp`));
  }

  async getOwnedMedia(input: { accountId?: string; after?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 25);
    const path = `/${encodeURIComponent(input.accountId ?? "me")}/media`;
    const query = new URLSearchParams({
      fields: "id,caption,media_type,media_product_type,permalink,timestamp",
      limit: String(limit),
    });
    if (input.after) query.set("after", input.after);
    return OwnedMediaPageSchema.parse(await this.request(`${path}?${query.toString()}`));
  }

  async getAccountSnapshot(accountId = "me") {
    return AccountSnapshotSchema.parse(await this.request(`/${encodeURIComponent(accountId)}?fields=id,followers_count,follows_count,media_count`));
  }

  async getMediaDetails(mediaId: string) {
    return z.object({ id: z.string(), media_type: z.string().optional(), media_product_type: z.string().optional(), permalink: z.string().url().optional(), timestamp: z.string().optional() }).parse(
      await this.request(`/${encodeURIComponent(mediaId)}?fields=id,media_type,media_product_type,permalink,timestamp`),
    );
  }

  async getPublishingLimit(accountId: string) {
    return this.request(`/${encodeURIComponent(accountId)}/content_publishing_limit`);
  }

  async preparePublication(accountId: string, rawInput: PublishMedia) {
    const input = PublishMediaSchema.parse(rawInput);
    if (input.kind === "IMAGE") {
      return this.createContainer(accountId, { image_url: input.mediaUrls[0], caption: input.caption, ...(input.altText ? { alt_text: input.altText } : {}) });
    }
    if (input.kind === "REELS") {
      return this.createContainer(accountId, { video_url: input.mediaUrls[0], media_type: "REELS", caption: input.caption, share_to_feed: input.shareToFeed });
    }
    const children: string[] = [];
    for (let index = 0; index < input.mediaUrls.length; index += 1) {
      const mediaUrl = input.mediaUrls[index]!;
      const mediaType = input.mediaTypes[index]!;
      children.push(await this.createContainer(accountId, mediaType === "VIDEO" ? { video_url: mediaUrl, media_type: "VIDEO", is_carousel_item: true } : { image_url: mediaUrl, is_carousel_item: true }));
    }
    return this.createContainer(accountId, { media_type: "CAROUSEL", children, caption: input.caption });
  }

  async getMediaInsights(mediaId: string, metrics: string[]) {
    if (!metrics.length) throw new Error("At least one insight metric is required.");
    return z.object({ data: z.array(z.object({ name: z.string(), period: z.string().optional(), values: z.array(z.object({ value: z.unknown(), end_time: z.string().optional() })).optional(), total_value: z.unknown().optional() })) }).parse(
      await this.request(`/${encodeURIComponent(mediaId)}/insights?metric=${encodeURIComponent(metrics.join(","))}`),
    );
  }

  async getComments(mediaId: string) {
    return z.object({ data: z.array(z.object({ id: z.string(), text: z.string(), timestamp: z.string().optional(), username: z.string().optional() })) }).parse(
      await this.request(`/${encodeURIComponent(mediaId)}/comments?fields=id,text,timestamp,username`),
    );
  }
}
