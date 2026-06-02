"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@launchthatapp/ui/button";
import { toast } from "@launchthatapp/ui/toast";

import {
  DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
  EMPTY_QUESTIONNAIRE_VALUES,
  PUBLIC_QUESTIONNAIRE_STEPS,
  QuestionaireForm,
  QuestionnaireQualificationsInput,
  type QuestionnaireFieldOptions,
  type QuestionnaireFieldName,
  type QuestionnaireQualification,
  type QuestionnaireFormValues,
} from "~/components/forms/questionaire-form";

interface ResolvedContact {
  id: string;
  name: string;
  email: string | null;
}

interface QuestionnaireApiPayload {
  gender?: string;
  entryLevel?: string[] | string;
  skilled?: string[] | string;
  startDate?: string;
  ethnicity?: string;
  educationLevel?: string;
  usWorkEligible?: string;
  veteran?: string;
  secondChance?: string;
  transportation?: string;
  workSchedule?: string;
  candidateEducation?: string;
  desiredHourlyWage?: string;
}

const toLabelArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter((item) => item.length > 0);
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const buildQualificationsFromPayload = (
  payload: QuestionnaireApiPayload | undefined,
): QuestionnaireQualification[] => {
  if (!payload) return [];
  const output = new Map<string, QuestionnaireQualification>();
  for (const workType of toLabelArray(payload.entryLevel)) {
    output.set(workType.toLowerCase(), { workType, skillLevel: "entry" });
  }
  for (const workType of toLabelArray(payload.skilled)) {
    output.set(workType.toLowerCase(), { workType, skillLevel: "skilled" });
  }
  return Array.from(output.values()).sort((a, b) => a.workType.localeCompare(b.workType));
};

const mapQualificationsToColumns = (qualifications: QuestionnaireQualification[]) => {
  const entryLevel = qualifications
    .filter((item) => item.skillLevel === "entry")
    .map((item) => item.workType);
  const skilled = qualifications
    .filter((item) => item.skillLevel === "skilled")
    .map((item) => item.workType);
  return { entryLevel, skilled };
};

const getFirstIncompleteStep = (
  values: QuestionnaireFormValues,
  qualifications: QuestionnaireQualification[],
) => {
  for (let index = 0; index < PUBLIC_QUESTIONNAIRE_STEPS.length; index += 1) {
    const step = PUBLIC_QUESTIONNAIRE_STEPS[index];
    if (step.requiresQualificationSelection && qualifications.length === 0) return index;
    const hasMissingField = step.fields.some((fieldName) => !values[fieldName]?.trim());
    if (hasMissingField) return index;
  }
  return PUBLIC_QUESTIONNAIRE_STEPS.length - 1;
};

export default function PublicQuestionairePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = (searchParams.get("email") ?? "").trim();
  const [resolvedContact, setResolvedContact] = useState<ResolvedContact | null>(null);
  const [isResolvingContact, setIsResolvingContact] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [navigationDirection, setNavigationDirection] = useState(1);
  const [lastProgressSavedAt, setLastProgressSavedAt] = useState<number | null>(null);
  const [qualifications, setQualifications] = useState<QuestionnaireQualification[]>([]);
  const [qualificationError, setQualificationError] = useState<string | null>(null);
  const [questionnaireFieldOptions, setQuestionnaireFieldOptions] = useState<QuestionnaireFieldOptions>(
    DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
  );
  const stepCount = PUBLIC_QUESTIONNAIRE_STEPS.length;
  const activeStep = PUBLIC_QUESTIONNAIRE_STEPS[currentStep];
  const allStepFieldNames = useMemo(
    () => Array.from(new Set(PUBLIC_QUESTIONNAIRE_STEPS.flatMap((step) => step.fields))),
    [],
  );
  const qualificationSuggestions = useMemo(
    () =>
      Array.from(new Set([...questionnaireFieldOptions.entryLevel, ...questionnaireFieldOptions.skilled]))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .sort((a, b) => a.localeCompare(b)),
    [questionnaireFieldOptions.entryLevel, questionnaireFieldOptions.skilled],
  );

  const form = useForm<QuestionnaireFormValues>({
    defaultValues: EMPTY_QUESTIONNAIRE_VALUES,
    shouldUnregister: false,
  });

  const {
    getValues,
    reset,
    trigger,
    formState: { isDirty },
  } = form;

  const resolveContactByEmail = useCallback(
    async (targetEmail: string) => {
      const trimmedEmail = targetEmail.trim();
      if (!trimmedEmail) {
        setResolvedContact(null);
        return;
      }
      setIsResolvingContact(true);
      try {
        const params = new URLSearchParams({ email: trimmedEmail });
        const response = await fetch(`/api/forms/questionaire?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          contact?: ResolvedContact;
          questionnaire?: QuestionnaireApiPayload;
        };
        if (!response.ok || !data.ok || !data.contact) {
          throw new Error(data.error ?? "Unable to find your contact record");
        }
        setResolvedContact(data.contact);
        const questionnaire = data.questionnaire;
        const hydratedValues: QuestionnaireFormValues = {
          ...EMPTY_QUESTIONNAIRE_VALUES,
          gender: questionnaire?.gender ?? "",
          entryLevel: "",
          skilled: "",
          startDate: questionnaire?.startDate ?? "",
          ethnicity: questionnaire?.ethnicity ?? "",
          educationLevel: questionnaire?.educationLevel ?? "",
          usWorkEligible: questionnaire?.usWorkEligible ?? "",
          veteran: questionnaire?.veteran ?? "",
          secondChance: questionnaire?.secondChance ?? "",
          transportation: questionnaire?.transportation ?? "",
          workSchedule: questionnaire?.workSchedule ?? "",
          candidateEducation: questionnaire?.candidateEducation ?? "",
          desiredHourlyWage: questionnaire?.desiredHourlyWage ?? "",
        };
        const hydratedQualifications = buildQualificationsFromPayload(questionnaire);
        setQualifications(hydratedQualifications);
        reset(hydratedValues, { keepDirty: false, keepTouched: false });
        setCurrentStep(getFirstIncompleteStep(hydratedValues, hydratedQualifications));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to find your contact record";
        setResolvedContact(null);
        toast.error(message);
      } finally {
        setIsResolvingContact(false);
      }
    },
    [reset],
  );

  useEffect(() => {
    if (!emailParam) {
      setResolvedContact(null);
      setQualifications([]);
      reset(EMPTY_QUESTIONNAIRE_VALUES);
      return;
    }
    void resolveContactByEmail(emailParam);
  }, [emailParam, resolveContactByEmail, reset]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/forms/questionaire/options", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          options?: {
            gender?: string[];
            entryLevel?: string[];
            skilled?: string[];
            ethnicity?: string[];
            educationLevel?: string[];
            usWorkEligible?: string[];
            veteran?: string[];
            secondChance?: string[];
            transportation?: string[];
            workSchedule?: string[];
            candidateEducation?: string[];
            desiredHourlyWage?: string[];
          };
        };
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Failed to load questionnaire options");
        }
        setQuestionnaireFieldOptions({
          ...DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
          gender: data.options?.gender ?? [],
          entryLevel: data.options?.entryLevel ?? [],
          skilled: data.options?.skilled ?? [],
          ethnicity: data.options?.ethnicity ?? [],
          educationLevel: data.options?.educationLevel ?? [],
          usWorkEligible: data.options?.usWorkEligible ?? [],
          veteran: data.options?.veteran ?? [],
          secondChance: data.options?.secondChance ?? [],
          transportation: data.options?.transportation ?? [],
          workSchedule: data.options?.workSchedule ?? [],
          candidateEducation: data.options?.candidateEducation ?? [],
          desiredHourlyWage: data.options?.desiredHourlyWage ?? [],
        });
      } catch {
        // fallback options from shared component stay active
      }
    })();
  }, []);

  const persistQuestionnaire = useCallback(
    async ({
      submissionMode,
      fields,
      showErrorToast = true,
    }: {
      submissionMode: "partial" | "complete";
      fields?: QuestionnaireFieldName[];
      showErrorToast?: boolean;
    }) => {
      const trimmedEmail = emailParam.trim();
      if (!trimmedEmail || !resolvedContact) return false;
      const values = getValues();
      const payloadFields: Record<string, unknown> = {};
      if (fields && fields.length > 0) {
        for (const fieldName of fields) {
          payloadFields[fieldName] = values[fieldName];
        }
      } else {
        Object.assign(payloadFields, values);
      }
      const mappedQualifications = mapQualificationsToColumns(qualifications);
      payloadFields.entryLevel = mappedQualifications.entryLevel;
      payloadFields.skilled = mappedQualifications.skilled;

      try {
        const response = await fetch("/api/forms/questionaire", {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            submissionMode,
            ...payloadFields,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          contact?: ResolvedContact;
        };
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Failed to save questionnaire progress");
        }
        if (data.contact) {
          setResolvedContact(data.contact);
        }
        if (submissionMode === "partial") {
          setLastProgressSavedAt(Date.now());
        }
        return true;
      } catch (error) {
        if (showErrorToast) {
          const message =
            error instanceof Error ? error.message : "Failed to save questionnaire progress";
          toast.error(message);
        }
        return false;
      }
    },
    [emailParam, getValues, qualifications, resolvedContact],
  );

  const handleNextStep = useCallback(async () => {
    if (!activeStep) return;
    setQualificationError(null);
    const isCurrentStepValid =
      activeStep.fields.length === 0 ? true : await trigger(activeStep.fields, { shouldFocus: true });
    if (!isCurrentStepValid) return;
    if (activeStep.requiresQualificationSelection && qualifications.length === 0) {
      setQualificationError("Please add at least one work type before continuing.");
      return;
    }
    setIsSavingProgress(true);
    const saved = await persistQuestionnaire({
      submissionMode: "partial",
      fields: activeStep.fields,
    });
    setIsSavingProgress(false);
    if (!saved) return;
    if (currentStep < stepCount - 1) {
      setNavigationDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [activeStep, currentStep, persistQuestionnaire, qualifications.length, stepCount, trigger]);

  const handleFinalSubmit = useCallback(async () => {
    const trimmedEmail = emailParam.trim();
    if (!trimmedEmail) {
      toast.error("Invalid questionnaire link: missing email");
      return;
    }
    if (!resolvedContact) {
      toast.error("Unable to resolve contact for this questionnaire link");
      return;
    }
    setQualificationError(null);
    const allFieldsValid =
      allStepFieldNames.length === 0 ? true : await trigger(allStepFieldNames, { shouldFocus: true });
    if (!allFieldsValid) {
      toast.error("Please complete all required fields before submitting.");
      return;
    }
    if (qualifications.length === 0) {
      setQualificationError("Please add at least one work type before submitting.");
      setNavigationDirection(-1);
      setCurrentStep(0);
      return;
    }

    setIsSubmitting(true);
    const saved = await persistQuestionnaire({ submissionMode: "complete" });
    try {
      if (!saved) return;
      setIsSubmitted(true);
      setQualifications([]);
      reset(EMPTY_QUESTIONNAIRE_VALUES);
      toast.success("Screening questionnaire submitted");
      const successParams = new URLSearchParams();
      if (trimmedEmail) {
        successParams.set("email", trimmedEmail);
      }
      if (resolvedContact.name?.trim()) {
        successParams.set("name", resolvedContact.name.trim());
      }
      const nextUrl = successParams.toString()
        ? `/forms/questionaire/success?${successParams.toString()}`
        : "/forms/questionaire/success";
      router.push(nextUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    allStepFieldNames,
    emailParam,
    persistQuestionnaire,
    qualifications.length,
    reset,
    resolvedContact,
    router,
    trigger,
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Screening Questionnaire</h1>
          <p className="text-sm text-slate-600">
            Quick steps first, then a few final details. Your progress saves as you move forward.
          </p>
        </header>

        {!emailParam ? (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Invalid form link. Missing <code>email</code> query parameter.
          </div>
        ) : null}

        {emailParam && isResolvingContact ? (
          <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Loading contact details...
          </div>
        ) : null}

        {emailParam && resolvedContact ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Completing screening for <span className="font-medium">{resolvedContact.name || "Contact"}</span>
            {resolvedContact.email ? ` (${resolvedContact.email})` : ""}
          </div>
        ) : null}

        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Step {currentStep + 1} of {stepCount}
            </span>
            <span>{Math.round(((currentStep + 1) / stepCount) * 100)}% complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / stepCount) * 100}%` }}
            />
          </div>
        </div>

        <div className="relative min-h-[430px] overflow-hidden rounded-lg border bg-white p-4 sm:p-5">
          <AnimatePresence custom={navigationDirection} mode="wait">
            <motion.div
              key={activeStep.id}
              custom={navigationDirection}
              initial={{ opacity: 0, x: navigationDirection > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: navigationDirection > 0 ? -30 : 30 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{activeStep.title}</h2>
                <p className="text-sm text-slate-600">{activeStep.subtitle}</p>
              </div>

              {activeStep.requiresQualificationSelection ? (
                <QuestionnaireQualificationsInput
                  suggestions={qualificationSuggestions}
                  qualifications={qualifications}
                  onChange={(nextQualifications) => {
                    setQualifications(nextQualifications);
                    setQualificationError(null);
                  }}
                  required
                  errorMessage={qualificationError ?? undefined}
                />
              ) : null}

              <QuestionaireForm
                form={form}
                requireAllFields
                fieldOptions={questionnaireFieldOptions}
                visibleFields={activeStep.fields}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pt-3">
          <p className="text-xs text-slate-500">
            {isSavingProgress
              ? "Saving progress..."
              : lastProgressSavedAt
                ? `Progress saved at ${new Date(lastProgressSavedAt).toLocaleTimeString()}`
                : "Progress will save when you continue to the next step."}
          </p>
        </div>

        <div className="flex justify-between gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (currentStep === 0) return;
              setNavigationDirection(-1);
              setCurrentStep((prev) => prev - 1);
            }}
            disabled={isSubmitting || isSavingProgress || currentStep === 0}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset(EMPTY_QUESTIONNAIRE_VALUES);
                setQualifications([]);
                setQualificationError(null);
                setCurrentStep(0);
              }}
              disabled={isSubmitting || !isDirty}
            >
              Reset
            </Button>
            {currentStep === stepCount - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  void handleFinalSubmit();
                }}
                disabled={isSubmitting || isSavingProgress || !emailParam || !resolvedContact}
              >
                {isSubmitting ? "Submitting..." : "Submit Screening"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  void handleNextStep();
                }}
                disabled={isSubmitting || isSavingProgress || !emailParam || !resolvedContact}
              >
                Next
              </Button>
            )}
          </div>
        </div>

        {!resolvedContact && emailParam ? (
          <p className="pt-3 text-xs text-rose-600">
            We could not match this link to a contact record yet. Please refresh or request a new
            link.
          </p>
        ) : null}

        {isSubmitted ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Thanks. Your screening responses were submitted successfully.
          </div>
        ) : null}
      </div>
    </main>
  );
}
