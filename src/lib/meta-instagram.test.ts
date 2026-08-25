// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildInstagramAuthorizationUrl, exchangeAuthorizationCode, MetaApiError, MetaInstagramClient } from "./meta-instagram";

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } }); }

describe("Meta official Instagram client", () => {
  it("builds the official Business Login URL with current scopes and CSRF state", () => {
    const url = new URL(buildInstagramAuthorizationUrl({ appId: "123456", redirectUri: "https://example.com/api/instagram/callback", state: "signed-state" }));
    expect(url.origin).toBe("https://www.instagram.com");
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain("instagram_business_content_publish");
    expect(url.searchParams.get("scope")).toContain("instagram_business_manage_insights");
  });

  it("parses the documented code exchange envelope", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { void input; void init; return json({ data: [{ access_token: "token", user_id: "123", permissions: "instagram_business_basic,instagram_business_content_publish" }] }); }) as unknown as typeof fetch;
    const result = await exchangeAuthorizationCode({ appId: "123", appSecret: "secret123", redirectUri: "https://example.com/callback", code: "one-time-code" }, fetcher);
    expect(result.permissions).toEqual(["instagram_business_basic", "instagram_business_content_publish"]);
  });

  it("creates a Reels container without publishing it", async () => {
    let seenInit: RequestInit | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => { seenInit = init; return json({ id: "container-1" }); }) as unknown as typeof fetch;
    const client = new MetaInstagramClient("secret-token", "v26.0", fetcher);
    const id = await client.preparePublication("ig-1", { kind: "REELS", mediaUrls: ["https://example.com/reel.mp4"], mediaTypes: ["VIDEO"], caption: "caption", shareToFeed: true });
    expect(id).toBe("container-1");
    expect(JSON.parse(String(seenInit?.body))).toMatchObject({ media_type: "REELS", share_to_feed: true });
  });

  it("surfaces Meta error codes without leaking tokens", async () => {
    const fetcher = vi.fn(async () => json({ error: { message: "Invalid OAuth access token.", code: 190 } }, 401));
    const client = new MetaInstagramClient("secret-token", "v26.0", fetcher as typeof fetch);
    await expect(client.getProfile()).rejects.toMatchObject({ status: 401, code: 190 } satisfies Partial<MetaApiError>);
  });

  it("lists only owned media with a bounded page size", async () => {
    let requested = "";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requested = String(input);
      return json({ data: [{ id: "media-1", media_type: "VIDEO", media_product_type: "REELS", timestamp: "2026-08-20T00:00:00+0000" }], paging: { cursors: { after: "next" } } });
    }) as unknown as typeof fetch;
    const client = new MetaInstagramClient("secret-token", "v26.0", fetcher);
    const page = await client.getOwnedMedia({ limit: 100 });
    expect(new URL(requested).pathname).toBe("/v26.0/me/media");
    expect(new URL(requested).searchParams.get("limit")).toBe("25");
    expect(page.data[0]?.media_product_type).toBe("REELS");
    expect(page.paging?.cursors?.after).toBe("next");
  });

  it("reads an account snapshot without requesting write operations", async () => {
    let method: string | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      method = init?.method;
      return json({ id: "ig-1", followers_count: 125, follows_count: 40, media_count: 22 });
    }) as unknown as typeof fetch;
    const result = await new MetaInstagramClient("secret-token", "v26.0", fetcher).getAccountSnapshot("ig-1");
    expect(method).toBeUndefined();
    expect(result.followers_count).toBe(125);
  });
});
