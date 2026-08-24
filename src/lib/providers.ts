import type { ReelsPlan } from "./domain";
import type { SilenceRange, Transcript, VideoMetadata } from "./video-domain";
import type { SaveContentDraftInput, SaveContentDraftResult } from "./content-draft";
import type { BrandBrain } from "./domain";
import { orchestrateContent, type OrchestratorInput, type OrchestratorResult } from "./orchestrator";

export type ProviderMode = "demo" | "real";
export interface ProviderContext { workspaceId: string; userId: string; requestId: string; mode: ProviderMode }
export interface AIProvider { generateContentPlan(input: OrchestratorInput, context: ProviderContext, brand?: BrandBrain): Promise<OrchestratorResult>; generateReelsPlan(input: { topic?: string }, context: ProviderContext): Promise<ReelsPlan> }
export interface InstagramProvider { getCapabilities(context: ProviderContext): Promise<Record<string, boolean>>; publish(contentId: string, approvalId: string, context: ProviderContext): Promise<{ externalId: string }> }
export interface RenderProvider { enqueue(edlVersionId: string, context: ProviderContext): Promise<{ jobId: string }> }
export interface StorageProvider { createUpload(name: string, contentType: string, context: ProviderContext): Promise<{ uploadUrl: string; assetId: string }> }
export interface VideoAnalysisProvider { analyze(source: string, context: ProviderContext): Promise<{ metadata: VideoMetadata; silences: SilenceRange[] }> }
export interface TranscriptionProvider { transcribe(source: string, context: ProviderContext): Promise<Transcript> }
export interface AnalyticsProvider { getAccountSnapshot(context: ProviderContext): Promise<{ reach: number; followersDelta: number; dm: number }> }
export interface ContentRepository { saveDraft(input: SaveContentDraftInput, context: ProviderContext): Promise<SaveContentDraftResult> }

export class DisabledInstagramProvider implements InstagramProvider {
  async getCapabilities() { return { publishing: false, reels: false, carousel: false, stories: false, insights: false, messaging: false }; }
  async publish(): Promise<{ externalId: string }> { throw new Error("Instagram is not connected. Production publishing is unavailable in Demo Mode."); }
}

export class DisabledTranscriptionProvider implements TranscriptionProvider {
  async transcribe(): Promise<Transcript> {
    return { provider: "MANUAL", status: "UNAVAILABLE", language: "ja", words: [], createdAt: new Date().toISOString() };
  }
}

export class DisabledProductionRenderProvider implements RenderProvider {
  async enqueue(): Promise<{ jobId: string }> {
    throw new Error("Production render provider is not configured. Use the LOCAL queue after reviewing Remotion licensing and infrastructure costs.");
  }
}

export class DeterministicPhase1AIProvider implements AIProvider {
  async generateContentPlan(input: OrchestratorInput, _context: ProviderContext, brand?: BrandBrain) { return orchestrateContent(input, brand); }
  async generateReelsPlan(input: { topic?: string }, context: ProviderContext) {
    const result = await this.generateContentPlan({ contentType: "REELS", topic: input.topic }, context);
    if (result.plan.contentType !== "REELS") throw new Error("Unexpected content contract.");
    return result.plan;
  }
}
