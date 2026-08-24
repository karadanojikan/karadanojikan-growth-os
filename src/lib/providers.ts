import type { ReelsPlan } from "./domain";
import type { SaveContentDraftInput, SaveContentDraftResult } from "./content-draft";

export type ProviderMode = "demo" | "real";
export interface ProviderContext { workspaceId: string; userId: string; requestId: string; mode: ProviderMode }
export interface AIProvider { generateReelsPlan(input: { topic?: string }, context: ProviderContext): Promise<ReelsPlan> }
export interface InstagramProvider { getCapabilities(context: ProviderContext): Promise<Record<string, boolean>>; publish(contentId: string, approvalId: string, context: ProviderContext): Promise<{ externalId: string }> }
export interface RenderProvider { enqueue(edlVersionId: string, context: ProviderContext): Promise<{ jobId: string }> }
export interface StorageProvider { createUpload(name: string, contentType: string, context: ProviderContext): Promise<{ uploadUrl: string; assetId: string }> }
export interface AnalyticsProvider { getAccountSnapshot(context: ProviderContext): Promise<{ reach: number; followersDelta: number; dm: number }> }
export interface ContentRepository { saveDraft(input: SaveContentDraftInput, context: ProviderContext): Promise<SaveContentDraftResult> }

export class DisabledInstagramProvider implements InstagramProvider {
  async getCapabilities() { return { publishing: false, reels: false, carousel: false, stories: false, insights: false, messaging: false }; }
  async publish(): Promise<{ externalId: string }> { throw new Error("Instagram is not connected. Production publishing is unavailable in Demo Mode."); }
}
