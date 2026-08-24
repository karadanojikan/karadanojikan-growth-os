import { z } from "zod";
import { ContentPlanSchema } from "./domain";

export const SaveContentDraftSchema = z.object({
  plan: ContentPlanSchema,
  versions: z.array(ContentPlanSchema).min(1).max(20).optional(),
  scheduledFor: z.string().datetime(),
}).superRefine((value, context) => {
  const versions = value.versions ?? [value.plan];
  if (versions.some((version) => version.contentType !== value.plan.contentType || version.id !== value.plan.id)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Version history must belong to the same plan." });
  }
  if (versions.at(-1)?.version !== value.plan.version) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Current plan must be the latest version." });
  }
});
export type SaveContentDraftInput = z.infer<typeof SaveContentDraftSchema>;

export type SaveContentDraftResult = {
  contentId: string;
  version: number;
  mode: "demo" | "real";
};
