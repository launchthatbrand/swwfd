export type AssistantExperienceId = "support" | "lms-quiz" | "lms-content";

export interface AssistantExperienceDefinition {
  id: AssistantExperienceId;
  label: string;
  description?: string;
  buildDefaultMessage?: (
    context: Record<string, unknown>,
  ) => string | null | undefined;
}

export interface AssistantExperienceTrigger {
  experienceId?: AssistantExperienceId;
  context?: Record<string, unknown>;
  message?: string;
}

export const SUPPORT_ASSISTANT_EVENT = "launchthat-support-assistant-open";
export const DEFAULT_ASSISTANT_EXPERIENCE_ID: AssistantExperienceId = "support";
export const LMS_QUIZ_ASSISTANT_EXPERIENCE_ID: AssistantExperienceId =
  "lms-quiz";
export const LMS_CONTENT_ASSISTANT_EXPERIENCE_ID: AssistantExperienceId =
  "lms-content";

const registry = new Map<
  AssistantExperienceId,
  AssistantExperienceDefinition
>();

export const registerAssistantExperience = (
  definition: AssistantExperienceDefinition,
) => {
  registry.set(definition.id, definition);
};

export const getAssistantExperience = (
  id?: AssistantExperienceId | null,
): AssistantExperienceDefinition => {
  if (id && registry.has(id as AssistantExperienceId)) {
    return registry.get(id as AssistantExperienceId)!;
  }
  return (
    registry.get(DEFAULT_ASSISTANT_EXPERIENCE_ID)! ?? {
      id: DEFAULT_ASSISTANT_EXPERIENCE_ID,
      label: "Support Assistant",
    }
  );
};

export const listAssistantExperiences = () => Array.from(registry.values());

export const openSupportAssistantExperience = (
  trigger: AssistantExperienceTrigger,
) => {
  if (typeof window === "undefined") {
    return;
  }
  const experience = getAssistantExperience(
    trigger.experienceId ?? DEFAULT_ASSISTANT_EXPERIENCE_ID,
  );
  const defaultMessage = experience.buildDefaultMessage
    ? experience.buildDefaultMessage(trigger.context ?? {})
    : null;

  window.dispatchEvent(
    new CustomEvent<Required<AssistantExperienceTrigger>>(
      SUPPORT_ASSISTANT_EVENT,
      {
        detail: {
          experienceId: experience.id,
          context: trigger.context ?? {},
          message: trigger.message ?? defaultMessage ?? "",
        },
      },
    ),
  );
};

registerAssistantExperience({
  id: "support",
  label: "Support Assistant",
});

registerAssistantExperience({
  id: "lms-quiz",
  label: "Lesson Quiz Builder",
  description:
    "Generates quiz drafts from the transcript and attaches them to the current lesson.",
  buildDefaultMessage: (context) => {
    const title =
      typeof context.lessonTitle === "string" && context.lessonTitle.length > 0
        ? ` "${context.lessonTitle}"`
        : "";
    return `Generate a quiz for lesson${title}.`;
  },
});

registerAssistantExperience({
  id: "lms-content",
  label: "Course Assistant",
  description:
    "Answers questions about the current course/lesson/topic using the organization's indexed content and transcripts.",
  buildDefaultMessage: (context) => {
    const postTypeSlug =
      typeof context.postTypeSlug === "string" ? context.postTypeSlug : null;
    const title = typeof context.title === "string" ? context.title : null;
    const kind =
      postTypeSlug === "courses"
        ? "course"
        : postTypeSlug === "lessons"
          ? "lesson"
          : postTypeSlug === "topics"
            ? "topic"
            : "content";

    if (title && title.trim().length > 0) {
      return `Tell me about this ${kind}: "${title.trim()}".`;
    }

    return `Tell me about this ${kind}.`;
  },
});
