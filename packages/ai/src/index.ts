import { z } from "zod";

export interface QuizPromptInput {
  lessonTitle: string;
  transcript: string;
  questionCount?: number;
  audienceLevel?: "beginner" | "intermediate" | "advanced";
}

export const quizQuestionSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompts should provide enough context for the learner."),
  choices: z
    .array(
      z
        .string()
        .min(1)
        .describe("Single choice label presented to the learner."),
    )
    .min(2)
    .max(5)
    .describe("Multiple choice options for the question."),
  correctAnswer: z
    .string()
    .describe("The exact choice text that should be considered correct."),
  explanation: z
    .string()
    .optional()
    .describe("Helpful feedback explaining why the answer is correct."),
});

export const quizResponseSchema = z.object({
  summary: z
    .string()
    .optional()
    .describe("Optional overview of the quiz that was generated."),
  questions: z
    .array(quizQuestionSchema)
    .min(3, "Aim to generate at least three questions per quiz."),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizResponse = z.infer<typeof quizResponseSchema>;

export const AI_CREDITS_EXHAUSTED = "AI_CREDITS_EXHAUSTED";

export const isAiCreditsExhaustedError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const message =
    err instanceof Error
      ? err.message
      : typeof (err as { message?: unknown }).message === "string"
        ? String((err as { message?: unknown }).message)
        : "";
  return message.includes(AI_CREDITS_EXHAUSTED);
};

export const QUIZ_PROMPT_TEMPLATE = `
You are an LMS assistant that writes multiple-choice quizzes.

Output strictly follows this JSON schema:
{
  "summary": "string (optional)",
  "questions": [
    {
      "prompt": "Question text ending with a question mark.",
      "choices": ["Choice A", "Choice B", "Choice C"],
      "correctAnswer": "Choice A",
      "explanation": "Short explanation for the correct choice."
    }
  ]
}

Guidelines:
- Focus exclusively on the provided lesson transcript.
- Avoid repeating the transcript verbatim; paraphrase instead.
- Vary the difficulty of questions. Prefer single-correct-answer questions.
- Keep prompts under 220 characters and choices under 120 characters.
- If the transcript is short, still produce high-quality distinct questions.
- Never include Markdown, code fences, or commentary outside of the JSON.
`.trim();

export function buildQuizPrompt(input: QuizPromptInput): string {
  const questionCount = Math.max(3, Math.min(10, input.questionCount ?? 5));
  const audienceLine = input.audienceLevel
    ? `The questions should be appropriate for ${input.audienceLevel} learners.`
    : "";

  return `
${QUIZ_PROMPT_TEMPLATE}

Lesson title: "${input.lessonTitle || "Untitled lesson"}"
Desired question count: ${questionCount}
${audienceLine}

Lesson transcript:
"""
${input.transcript}
"""
`.trim();
}

export {
  LMS_AUTHORING_POST_TYPES,
  LMS_AUTHORING_SYSTEM_PROMPT,
  buildLmsAuthoringPrompt,
  lmsAuthoringPostTypeSchema,
  lmsAuthoringSectionSchema,
  lmsAuthoringPlanSchema,
  lmsAuthoringApplyPayloadSchema,
  lmsAuthoringPlanEnvelopeSchema,
  lmsAuthoringApplyResultEnvelopeSchema,
} from "./lmsAuthoring";
export type {
  LmsAuthoringPlan,
  LmsAuthoringApplyPayload,
  LmsAuthoringPlanEnvelope,
  LmsAuthoringApplyResultEnvelope,
} from "./lmsAuthoring";

export * from "./runtime";
