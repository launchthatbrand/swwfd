import { z } from "zod";

export const LMS_AUTHORING_POST_TYPES = ["lessons", "topics"] as const;

export const lmsAuthoringPostTypeSchema = z.enum(LMS_AUTHORING_POST_TYPES);

export const lmsAuthoringSectionSchema = z.object({
  heading: z.string().min(1).max(160),
  body: z.string().min(1).max(6000),
  bullets: z.array(z.string().min(1).max(280)).max(12).optional(),
  callout: z.string().min(1).max(500).optional(),
});

export const lmsAuthoringCtaSchema = z
  .object({
    label: z.string().min(1).max(80),
    href: z.string().min(1).max(500),
  })
  .optional();

export const lmsAuthoringPlanSchema = z.object({
  version: z.literal(1),
  requestId: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  summary: z.string().min(1).max(1500),
  objective: z.string().min(1).max(1200).optional(),
  audienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  sections: z.array(lmsAuthoringSectionSchema).min(2).max(12),
  cta: lmsAuthoringCtaSchema,
});

export const lmsAuthoringApplyPayloadSchema = z.object({
  version: z.literal(1),
  requestId: z.string().min(1).max(120),
  idempotencyKey: z.string().min(1).max(200),
  operations: z.array(z.literal("replace_puck_document")).min(1).max(1),
  organizationId: z.string().min(1).max(120),
  postId: z.string().min(1).max(120),
  postTypeSlug: lmsAuthoringPostTypeSchema,
  pageIdentifier: z.string().min(1).max(500),
  plan: lmsAuthoringPlanSchema,
});

export const lmsAuthoringPlanEnvelopeSchema = z.object({
  kind: z.literal("lms_authoring_plan_v1"),
  text: z.string().min(1).max(6000),
  plan: lmsAuthoringPlanSchema,
  applyPayload: lmsAuthoringApplyPayloadSchema,
});

export const lmsAuthoringApplyResultEnvelopeSchema = z.object({
  kind: z.literal("lms_authoring_apply_result_v1"),
  text: z.string().min(1).max(4000),
  result: z.object({
    applied: z.boolean(),
    requestId: z.string().min(1).max(120),
    postId: z.string().min(1).max(120),
    postTypeSlug: lmsAuthoringPostTypeSchema,
    pageIdentifier: z.string().min(1).max(500),
    idempotentReplay: z.boolean().optional(),
  }),
});

export type LmsAuthoringPlan = z.infer<typeof lmsAuthoringPlanSchema>;
export type LmsAuthoringApplyPayload = z.infer<
  typeof lmsAuthoringApplyPayloadSchema
>;
export type LmsAuthoringPlanEnvelope = z.infer<
  typeof lmsAuthoringPlanEnvelopeSchema
>;
export type LmsAuthoringApplyResultEnvelope = z.infer<
  typeof lmsAuthoringApplyResultEnvelopeSchema
>;

export interface BuildLmsAuthoringPromptInput {
  prompt: string;
  postTitle: string;
  postTypeSlug: z.infer<typeof lmsAuthoringPostTypeSchema>;
  existingLexicalOrHtml?: string;
  transcript?: string;
}

export const LMS_AUTHORING_SYSTEM_PROMPT = [
  "You are an LMS instructional designer and page-layout planner.",
  "You produce lesson/topic content with clear pedagogy and practical clarity.",
  "Return strict JSON only. No markdown fences. No prose outside JSON.",
  "The JSON must satisfy this shape:",
  "{",
  '  "version": 1,',
  '  "requestId": "short-unique-id",',
  '  "title": "string",',
  '  "summary": "string",',
  '  "objective": "string (optional)",',
  '  "audienceLevel": "beginner|intermediate|advanced (optional)",',
  '  "sections": [',
  "    {",
  '      "heading": "string",',
  '      "body": "string",',
  '      "bullets": ["string"] (optional),',
  '      "callout": "string" (optional)',
  "    }",
  "  ],",
  '  "cta": { "label": "string", "href": "string" } (optional)',
  "}",
  "Rules:",
  "- Keep sections concise and sequential.",
  "- Include examples when useful.",
  "- Prefer language that can map into layout blocks (heading/text/bullets/callout).",
  "- Never exceed 12 sections.",
].join("\n");

export function buildLmsAuthoringPrompt(
  input: BuildLmsAuthoringPromptInput,
): string {
  const transcript = input.transcript?.trim();
  const existing = input.existingLexicalOrHtml?.trim();
  const postTypeLabel = input.postTypeSlug === "topics" ? "topic" : "lesson";

  return [
    `Create ${postTypeLabel} content and layout-ready sections for "${input.postTitle}".`,
    `User request: ${input.prompt}`,
    "",
    existing
      ? `Existing content context (may be stale; improve it):\n"""\n${existing}\n"""`
      : "Existing content context: none",
    "",
    transcript
      ? `Transcript context (use when relevant):\n"""\n${transcript}\n"""`
      : "Transcript context: none",
  ].join("\n");
}

