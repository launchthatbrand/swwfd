"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

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
  EMPTY_QUESTIONNAIRE_VALUES,
  QuestionaireForm,
  type QuestionnaireFormValues,
} from "~/components/forms/questionaire-form";
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
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  records: MondayRecord[];
  sessionToken: string;
  staticMode: boolean;
  resolveItemId: (record: MondayRecord) => string;
  onSaved: () => Promise<void>;
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const valuesByItemIdRef = useRef<Map<string, QuestionnaireFormValues>>(new Map());

  const recordsKey = records.map((r) => resolveItemId(r)).join("|");

  const form = useForm<QuestionnaireFormValues>({
    defaultValues: EMPTY_QUESTIONNAIRE_VALUES,
  });

  const { handleSubmit, reset, getValues } = form;

  useEffect(() => {
    if (!open) return;
    setSlideIndex(0);
    valuesByItemIdRef.current = new Map();
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
      setSlideIndex(nextIndex);
      const nextRecord = records[nextIndex];
      if (!nextRecord) return;
      const nextId = resolveItemId(nextRecord);
      const stored = valuesByItemIdRef.current.get(nextId);
      reset(stored ?? EMPTY_QUESTIONNAIRE_VALUES);
    },
    [activeRecord, getValues, records, reset, resolveItemId],
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
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(activeItemId)}/questionnaire`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": sessionToken,
          },
          body: JSON.stringify(data),
        },
      );
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Failed to save questionnaire");
      }
      valuesByItemIdRef.current.set(activeItemId, data);
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
          <QuestionaireForm form={form} />

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
            <Button type="submit" disabled={saving || !activeRecord}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
