"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { toast } from "@launchthatapp/ui/toast";

import {
  DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
  EMPTY_QUESTIONNAIRE_VALUES,
  PUBLIC_QUESTIONNAIRE_STEPS,
  QuestionaireForm,
  QuestionnaireQualificationsInput,
  type QuestionnaireFieldOptions,
  type QuestionnaireQualification,
  type QuestionnaireFormValues,
} from "~/components/forms/questionaire-form";
import { useAction } from "convex/react";
import { api } from "@convex-config/_generated/api";

import { QUESTIONNAIRE_UPDATE_ACTION } from "../constants";
import type { MondayRecord } from "../types";

export function QuestionnaireFormDialog({
  open,
  onOpenChange,
  records,
  sessionToken,
  staticMode,
  resolveItemId,
  onSaved,
  fieldOptions = DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  records: MondayRecord[];
  sessionToken: string;
  staticMode: boolean;
  resolveItemId: (record: MondayRecord) => string;
  onSaved: () => Promise<void>;
  fieldOptions?: QuestionnaireFieldOptions;
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [navigationDirection, setNavigationDirection] = useState(1);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [qualifications, setQualifications] = useState<QuestionnaireQualification[]>([]);
  const saveQuestionnaireAction = useAction(api.mondayQuestionnaireNode.saveQuestionnaire);
  const createRecordUpdateAction = useAction(api.mondayRecordsNode.createRecordUpdate);
  const valuesByItemIdRef = useRef<Map<string, QuestionnaireFormValues>>(new Map());
  const qualificationsByItemIdRef = useRef<Map<string, QuestionnaireQualification[]>>(new Map());
  const stepByItemIdRef = useRef<Map<string, number>>(new Map());

  const recordsKey = records.map((r) => resolveItemId(r)).join("|");

  const form = useForm<QuestionnaireFormValues>({
    defaultValues: EMPTY_QUESTIONNAIRE_VALUES,
  });

  const { handleSubmit, reset, getValues } = form;
  const steps = PUBLIC_QUESTIONNAIRE_STEPS;
  const activeStep = steps[stepIndex];
  const stepCount = steps.length;
  const qualificationSuggestions = useMemo(
    () =>
      Array.from(new Set([...fieldOptions.entryLevel, ...fieldOptions.skilled]))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .sort((a, b) => a.localeCompare(b)),
    [fieldOptions.entryLevel, fieldOptions.skilled],
  );
  const mapQualificationsToColumns = (items: QuestionnaireQualification[]) => {
    const entryLevel = items
      .filter((item) => item.skillLevel === "entry")
      .map((item) => item.workType);
    const skilled = items
      .filter((item) => item.skillLevel === "skilled")
      .map((item) => item.workType);
    return { entryLevel, skilled };
  };

  useEffect(() => {
    if (!open) return;
    setSlideIndex(0);
    setStepIndex(0);
    setNavigationDirection(1);
    setQualifications([]);
    valuesByItemIdRef.current = new Map();
    qualificationsByItemIdRef.current = new Map();
    stepByItemIdRef.current = new Map();
    setSavedItemIds(new Set());
    reset(EMPTY_QUESTIONNAIRE_VALUES);
  }, [open, recordsKey, reset]);

  const activeRecord = records[slideIndex];
  const activeItemId = activeRecord ? resolveItemId(activeRecord) : "";
  const isBulk = records.length > 1;
  const isSaved = activeItemId.length > 0 && savedItemIds.has(activeItemId);

  const persistCurrentThen = useCallback(
    (nextIndex: number) => {
      if (!activeRecord || records.length === 0) return;
      const curId = resolveItemId(activeRecord);
      valuesByItemIdRef.current.set(curId, getValues());
      qualificationsByItemIdRef.current.set(curId, qualifications);
      stepByItemIdRef.current.set(curId, stepIndex);
      setSlideIndex(nextIndex);
      setStepIndex(0);
      const nextRecord = records[nextIndex];
      if (!nextRecord) return;
      const nextId = resolveItemId(nextRecord);
      const stored = valuesByItemIdRef.current.get(nextId);
      reset(stored ?? EMPTY_QUESTIONNAIRE_VALUES);
      setQualifications(qualificationsByItemIdRef.current.get(nextId) ?? []);
      const storedStep = stepByItemIdRef.current.get(nextId);
      if (typeof storedStep === "number" && storedStep >= 0 && storedStep < stepCount) {
        setStepIndex(storedStep);
      }
    },
    [activeRecord, getValues, qualifications, records, reset, resolveItemId, stepCount, stepIndex],
  );

  const onSubmit = handleSubmit(async (data) => {
    if (staticMode) {
      toast.error("Unavailable in static mode");
      return;
    }
    if (!sessionToken.trim()) {
      toast.error("Missing monday session token");
      return;
    }
    if (!activeRecord || !activeItemId.trim()) return;

    setSaving(true);
    try {
      const shouldLogScreeningCompleted = !savedItemIds.has(activeItemId);
      const mappedQualifications = mapQualificationsToColumns(qualifications);
      await saveQuestionnaireAction({
        sessionToken,
        itemId: activeItemId,
        ...data,
        entryLevel: mappedQualifications.entryLevel,
        skilled: mappedQualifications.skilled,
      });
      if (shouldLogScreeningCompleted) {
        await createRecordUpdateAction({
          sessionToken,
          itemId: activeItemId,
          updateType: "questionnaire",
          body: "Screening Completed",
          suppressApprovalStepMarking: true,
        });
      }
      valuesByItemIdRef.current.set(activeItemId, data);
      qualificationsByItemIdRef.current.set(activeItemId, qualifications);
      setSavedItemIds((prev) => new Set(prev).add(activeItemId));
      await onSaved();
      if (records.length === 1) {
        onOpenChange(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save questionnaire";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  });

  const handleNextStep = useCallback(async () => {
    if (!activeStep) return;
    if (stepIndex < stepCount - 1) {
      setNavigationDirection(1);
      setStepIndex((prev) => prev + 1);
    }
  }, [activeStep, stepCount, stepIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader className="border-b bg-background pb-3">
          {isBulk ? (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={slideIndex <= 0 || saving}
                  onClick={() => persistCurrentThen(slideIndex - 1)}
                  aria-label="Previous contact"
                  title="Previous contact"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={slideIndex >= records.length - 1 || saving}
                  onClick={() => persistCurrentThen(slideIndex + 1)}
                  aria-label="Next contact"
                  title="Next contact"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <DialogTitle className="min-w-0 truncate">
                  {activeRecord?.name ?? QUESTIONNAIRE_UPDATE_ACTION.label}
                </DialogTitle>
              </div>
              <DialogDescription>
                Contact {slideIndex + 1} of {records.length}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>{activeRecord?.name ?? "Contact"}</DialogTitle>
              <DialogDescription>{QUESTIONNAIRE_UPDATE_ACTION.label}</DialogDescription>
            </>
          )}
        </DialogHeader>

        <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                Step {stepIndex + 1} of {stepCount}
              </span>
              <span>{Math.round(((stepIndex + 1) / stepCount) * 100)}%</span>
            </div>
            <div className="bg-muted h-2 w-full rounded-full">
              <div
                className="h-2 rounded-full bg-slate-900 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / stepCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-lg border p-4">
            <AnimatePresence custom={navigationDirection} mode="wait">
              <motion.div
                key={`${activeItemId}:${activeStep.id}`}
                custom={navigationDirection}
                initial={{ opacity: 0, x: navigationDirection > 0 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: navigationDirection > 0 ? -30 : 30 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{activeStep.title}</h3>
                  <p className="text-muted-foreground text-xs">{activeStep.subtitle}</p>
                </div>

                {activeStep.requiresQualificationSelection ? (
                  <QuestionnaireQualificationsInput
                    suggestions={qualificationSuggestions}
                    qualifications={qualifications}
                    onChange={(next) => {
                      setQualifications(next);
                    }}
                  />
                ) : null}

                <QuestionaireForm
                  form={form}
                  fieldOptions={fieldOptions}
                  visibleFields={activeStep.fields}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {isSaved ? (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <Check className="text-emerald-600 size-4" aria-hidden />
                Saved
              </span>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || stepIndex <= 0}
              onClick={() => {
                setNavigationDirection(-1);
                setStepIndex((prev) => Math.max(0, prev - 1));
              }}
            >
              Back
            </Button>
            {stepIndex < stepCount - 1 ? (
              <Button type="button" disabled={saving || !activeRecord} onClick={() => void handleNextStep()}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={saving || !activeRecord}>
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
