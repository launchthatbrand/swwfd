"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { toast } from "@launchthatapp/ui/toast";

import {
  QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS,
  QUESTIONNAIRE_SKILLED_OPTIONS,
  QUESTIONNAIRE_TRANSPORTATION,
  QUESTIONNAIRE_UPDATE_ACTION,
  QUESTIONNAIRE_WORK_SCHEDULE,
  QUESTIONNAIRE_YES_NO,
} from "../constants";
import type { MondayRecord } from "../types";

const SELECT_NONE = "__none__";

export interface QuestionnaireFormValues {
  gender: string;
  entryLevel: string;
  skilled: string;
  startDate: string;
  ethnicity: string;
  educationLevel: string;
  usWorkEligible: string;
  veteran: string;
  secondChance: string;
  transportation: string;
  workSchedule: string;
  candidateEducation: string;
  desiredHourlyWage: string;
}

const EMPTY_VALUES: QuestionnaireFormValues = {
  gender: "",
  entryLevel: "",
  skilled: "",
  startDate: "",
  ethnicity: "",
  educationLevel: "",
  usWorkEligible: "",
  veteran: "",
  secondChance: "",
  transportation: "",
  workSchedule: "",
  candidateEducation: "",
  desiredHourlyWage: "",
};

function CreatableCombo({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [...options].slice(0, 50);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [options, value]);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          autoComplete="off"
        />
        {open && filtered.length > 0 ? (
          <ul
            className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border p-1 shadow-md"
            role="listbox"
          >
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="hover:bg-muted focus:bg-muted w-full rounded px-2 py-1.5 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

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
    defaultValues: EMPTY_VALUES,
  });

  const { control, register, handleSubmit, reset, getValues } = form;

  useEffect(() => {
    if (!open) return;
    setSlideIndex(0);
    valuesByItemIdRef.current = new Map();
    setSavedItemIds(new Set());
    reset(EMPTY_VALUES);
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
      reset(stored ?? EMPTY_VALUES);
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
        <DialogHeader>
          <DialogTitle>
            {isBulk
              ? QUESTIONNAIRE_UPDATE_ACTION.label
              : (activeRecord?.name ?? "Contact")}
          </DialogTitle>
          {isBulk && activeRecord ? (
            <DialogDescription>
              Contact {slideIndex + 1} of {records.length}: {activeRecord.name}
            </DialogDescription>
          ) : (
            <DialogDescription>{QUESTIONNAIRE_UPDATE_ACTION.label}</DialogDescription>
          )}
        </DialogHeader>

        {isBulk ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={slideIndex <= 0 || saving}
              onClick={() => persistCurrentThen(slideIndex - 1)}
              aria-label="Previous contact"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-muted-foreground text-sm">
              {slideIndex + 1} / {records.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={slideIndex >= records.length - 1 || saving}
              onClick={() => persistCurrentThen(slideIndex + 1)}
              aria-label="Next contact"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1">
            <label htmlFor="q-gender" className="text-xs font-medium tracking-wide">
              Gender
            </label>
            <Input id="q-gender" {...register("gender")} />
          </div>

          <Controller
            name="entryLevel"
            control={control}
            render={({ field }) => (
              <CreatableCombo
                id="q-entry-level"
                label="Entry-level"
                value={field.value}
                onChange={field.onChange}
                options={QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS}
              />
            )}
          />

          <Controller
            name="skilled"
            control={control}
            render={({ field }) => (
              <CreatableCombo
                id="q-skilled"
                label="Skilled"
                value={field.value}
                onChange={field.onChange}
                options={QUESTIONNAIRE_SKILLED_OPTIONS}
              />
            )}
          />

          <div className="space-y-1">
            <label htmlFor="q-start" className="text-xs font-medium tracking-wide">
              Date you can start
            </label>
            <Input id="q-start" type="date" {...register("startDate")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="q-ethnicity" className="text-xs font-medium tracking-wide">
              Ethnicity
            </label>
            <Input id="q-ethnicity" {...register("ethnicity")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="q-edu-level" className="text-xs font-medium tracking-wide">
              Highest level of education
            </label>
            <Input id="q-edu-level" {...register("educationLevel")} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">
              Are you eligible to work in the United States?
            </p>
            <Controller
              name="usWorkEligible"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.trim() ? field.value : SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {QUESTIONNAIRE_YES_NO.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">Are you a veteran?</p>
            <Controller
              name="veteran"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.trim() ? field.value : SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {QUESTIONNAIRE_YES_NO.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">
              Are you a second chance job seeker?
            </p>
            <Controller
              name="secondChance"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.trim() ? field.value : SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {QUESTIONNAIRE_YES_NO.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">
              Do you have reliable transportation?
            </p>
            <Controller
              name="transportation"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.trim() ? field.value : SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {QUESTIONNAIRE_TRANSPORTATION.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">
              Are you looking for full-time or part-time work
            </p>
            <Controller
              name="workSchedule"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.trim() ? field.value : SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {QUESTIONNAIRE_WORK_SCHEDULE.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="q-cand-edu" className="text-xs font-medium tracking-wide">
              Candidate Education
            </label>
            <Input id="q-cand-edu" {...register("candidateEducation")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="q-wage" className="text-xs font-medium tracking-wide">
              Desired Hourly Wage
            </label>
            <Input id="q-wage" {...register("desiredHourlyWage")} />
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
            <Button type="submit" disabled={saving || !activeRecord}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
