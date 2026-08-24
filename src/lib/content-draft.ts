import { z } from "zod";
import { ReelsPlanSchema } from "./domain";

export const SaveContentDraftSchema = z.object({
  plan: ReelsPlanSchema,
  scheduledFor: z.string().datetime(),
});
export type SaveContentDraftInput = z.infer<typeof SaveContentDraftSchema>;

export type SaveContentDraftResult = {
  contentId: string;
  version: number;
  mode: "demo" | "real";
};
