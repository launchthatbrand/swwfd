"use client";

import { useMemo, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, X } from "lucide-react";

import {
  QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS,
  QUESTIONNAIRE_SKILLED_OPTIONS,
  QUESTIONNAIRE_TRANSPORTATION,
  QUESTIONNAIRE_WORK_SCHEDULE,
  QUESTIONNAIRE_YES_NO,
} from "~/app/monday/constants";

const SELECT_NONE = "__none__";
const REQUIRED_MESSAGE = "This field is required";

export type QuestionnaireFieldName = keyof QuestionnaireFormValues;

export interface QuestionnaireStepDefinition {
  id: string;
  title: string;
  subtitle: string;
  fields: QuestionnaireFieldName[];
  requiresQualificationSelection?: boolean;
}

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

export const EMPTY_QUESTIONNAIRE_VALUES: QuestionnaireFormValues = {
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

export interface QuestionnaireFieldOptions {
  gender: string[];
  entryLevel: string[];
  skilled: string[];
  ethnicity: string[];
  educationLevel: string[];
  usWorkEligible: string[];
  veteran: string[];
  secondChance: string[];
  transportation: string[];
  workSchedule: string[];
  candidateEducation: string[];
  desiredHourlyWage: string[];
}

export const DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS: QuestionnaireFieldOptions = {
  gender: [],
  entryLevel: [...QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS],
  skilled: [...QUESTIONNAIRE_SKILLED_OPTIONS],
  ethnicity: [],
  educationLevel: [],
  usWorkEligible: [...QUESTIONNAIRE_YES_NO],
  veteran: [...QUESTIONNAIRE_YES_NO],
  secondChance: [...QUESTIONNAIRE_YES_NO],
  transportation: [...QUESTIONNAIRE_TRANSPORTATION],
  workSchedule: [...QUESTIONNAIRE_WORK_SCHEDULE],
  candidateEducation: [],
  desiredHourlyWage: [],
};

export const PUBLIC_QUESTIONNAIRE_STEPS: QuestionnaireStepDefinition[] = [
  {
    id: "work-history",
    title: "Work Experience",
    subtitle: "Tell us what kind of work you have done before.",
    fields: [],
    requiresQualificationSelection: true,
  },
  {
    id: "availability",
    title: "Availability",
    subtitle: "Share when and how you can work.",
    fields: ["startDate", "transportation", "workSchedule"],
  },
  {
    id: "education-pay",
    title: "Education & Goals",
    subtitle: "Help us match you with the right opportunities.",
    fields: ["educationLevel", "candidateEducation", "desiredHourlyWage"],
  },
  {
    id: "profile",
    title: "Final Details",
    subtitle: "A few final details to complete your screening.",
    fields: ["gender", "ethnicity", "usWorkEligible", "veteran", "secondChance"],
  },
];

export type QualificationSkillLevel = "entry" | "skilled";

export interface QuestionnaireQualification {
  workType: string;
  skillLevel: QualificationSkillLevel;
}

function CreatableCombo({
  label,
  value,
  onChange,
  options,
  id,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  id: string;
  required: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [...options].slice(0, 50);
    return options.filter((option) => option.toLowerCase().includes(query)).slice(0, 50);
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
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          autoComplete="off"
          required={required}
        />
        {open && filtered.length > 0 ? (
          <ul
            className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border p-1 shadow-md"
            role="listbox"
          >
            {filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  className="hover:bg-muted focus:bg-muted w-full rounded px-2 py-1.5 text-left text-sm"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

const normalizeQualificationWorkType = (value: string) => value.trim().replace(/\s+/g, " ");

export function QuestionnaireQualificationsInput({
  suggestions,
  qualifications,
  onChange,
  required = false,
  errorMessage,
}: {
  suggestions: readonly string[];
  qualifications: QuestionnaireQualification[];
  onChange: (next: QuestionnaireQualification[]) => void;
  required?: boolean;
  errorMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [pendingWorkType, setPendingWorkType] = useState<string | null>(null);
  const selectedWorkTypeSet = useMemo(
    () => new Set(qualifications.map((item) => item.workType.toLowerCase())),
    [qualifications],
  );
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = suggestions.filter((item) => !selectedWorkTypeSet.has(item.toLowerCase()));
    if (!normalizedQuery) return base.slice(0, 12);
    return base.filter((item) => item.toLowerCase().includes(normalizedQuery)).slice(0, 12);
  }, [query, selectedWorkTypeSet, suggestions]);
  const normalizedQueryWorkType = normalizeQualificationWorkType(query);
  const canAddCustomWorkType =
    normalizedQueryWorkType.length > 0 &&
    !selectedWorkTypeSet.has(normalizedQueryWorkType.toLowerCase()) &&
    !filteredSuggestions.some(
      (item) => item.toLowerCase() === normalizedQueryWorkType.toLowerCase(),
    );

  const selectWorkType = (workType: string) => {
    const normalized = normalizeQualificationWorkType(workType);
    if (!normalized) return;
    setPendingWorkType(normalized);
  };

  const setSkillLevel = (skillLevel: QualificationSkillLevel) => {
    const workType = pendingWorkType;
    if (!workType) return;
    const nextMap = new Map(
      qualifications.map((item) => [item.workType.toLowerCase(), item] as const),
    );
    nextMap.set(workType.toLowerCase(), { workType, skillLevel });
    onChange(
      Array.from(nextMap.values()).sort((a, b) => a.workType.localeCompare(b.workType)),
    );
    setQuery("");
    setPendingWorkType(null);
  };

  const removeWorkType = (workType: string) => {
    onChange(qualifications.filter((item) => item.workType !== workType));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="questionnaire-work-history" className="text-sm font-medium">
          What do you do? What kind of work have you done before?
        </label>
        <p className="text-muted-foreground text-xs">
          Add one or more work types. We will ask for skill level on each one.
        </p>
      </div>

      <div className="relative">
        <Input
          id="questionnaire-work-history"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const firstMatch = filteredSuggestions[0];
              if (firstMatch) {
                selectWorkType(firstMatch);
                return;
              }
              if (canAddCustomWorkType) {
                selectWorkType(normalizedQueryWorkType);
              }
            }
          }}
          placeholder="Type work experience (example: carpentry, drywall, welding)"
          required={required}
          autoComplete="off"
        />
        {query.trim().length > 0 ? (
          <div className="bg-popover text-popover-foreground absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-md border p-1 shadow-lg">
            {filteredSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="hover:bg-muted flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectWorkType(item);
                }}
              >
                <span>{item}</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
            ))}
            {canAddCustomWorkType ? (
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectWorkType(normalizedQueryWorkType);
                }}
              >
                <span>Add &quot;{normalizedQueryWorkType}&quot;</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {!canAddCustomWorkType && filteredSuggestions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">No matches found.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {qualifications.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {qualifications.map((item) => (
            <Badge key={item.workType} variant="secondary" className="gap-1.5 py-1">
              <button
                type="button"
                className="hover:text-foreground/90 text-left"
                onClick={() => {
                  setPendingWorkType(item.workType);
                }}
              >
                {item.workType} - {item.skillLevel === "entry" ? "Entry-level" : "Skilled"}
              </button>
              <button
                type="button"
                className="hover:text-foreground/90"
                onClick={() => {
                  removeWorkType(item.workType);
                }}
                aria-label={`Remove ${item.workType}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}

      <Dialog
        open={Boolean(pendingWorkType)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingWorkType(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set skill level</DialogTitle>
            <DialogDescription>
              {pendingWorkType
                ? `How would you rate your experience in ${pendingWorkType}?`
                : "Choose a skill level."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSkillLevel("entry");
              }}
            >
              Entry-level
            </Button>
            <Button
              type="button"
              onClick={() => {
                setSkillLevel("skilled");
              }}
            >
              Skilled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function QuestionaireForm({
  form,
  requireAllFields = false,
  idPrefix = "q",
  fieldOptions = DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
  visibleFields,
}: {
  form: UseFormReturn<QuestionnaireFormValues>;
  requireAllFields?: boolean;
  idPrefix?: string;
  fieldOptions?: QuestionnaireFieldOptions;
  visibleFields?: QuestionnaireFieldName[];
}) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const resolveOptions = (values: string[], fallback: readonly string[]) =>
    values.length > 0 ? values : [...fallback];
  const resolvedOptions: QuestionnaireFieldOptions = {
    gender: fieldOptions.gender,
    entryLevel: resolveOptions(fieldOptions.entryLevel, QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS),
    skilled: resolveOptions(fieldOptions.skilled, QUESTIONNAIRE_SKILLED_OPTIONS),
    ethnicity: fieldOptions.ethnicity,
    educationLevel: fieldOptions.educationLevel,
    usWorkEligible: resolveOptions(fieldOptions.usWorkEligible, QUESTIONNAIRE_YES_NO),
    veteran: resolveOptions(fieldOptions.veteran, QUESTIONNAIRE_YES_NO),
    secondChance: resolveOptions(fieldOptions.secondChance, QUESTIONNAIRE_YES_NO),
    transportation: resolveOptions(fieldOptions.transportation, QUESTIONNAIRE_TRANSPORTATION),
    workSchedule: resolveOptions(fieldOptions.workSchedule, QUESTIONNAIRE_WORK_SCHEDULE),
    candidateEducation: fieldOptions.candidateEducation,
    desiredHourlyWage: fieldOptions.desiredHourlyWage,
  };
  const requiredRule = requireAllFields ? { required: REQUIRED_MESSAGE } : undefined;
  const required = requireAllFields;
  const isVisible = (fieldName: QuestionnaireFieldName) =>
    !visibleFields || visibleFields.includes(fieldName);

  return (
    <>
      {isVisible("gender") ? (
        <Controller
          name="gender"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <div>
              <CreatableCombo
                id={`${idPrefix}-gender`}
                label="Gender"
                value={field.value}
                onChange={field.onChange}
                options={resolvedOptions.gender}
                required={required}
              />
              {errors.gender ? (
                <p className="mt-1 text-xs text-rose-600">{errors.gender.message as string}</p>
              ) : null}
            </div>
          )}
        />
      ) : null}

      {isVisible("entryLevel") ? (
      <Controller
        name="entryLevel"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-entry-level`}
              label="Entry-level"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.entryLevel}
              required={required}
            />
            {errors.entryLevel ? (
              <p className="mt-1 text-xs text-rose-600">{errors.entryLevel.message as string}</p>
            ) : null}
          </div>
        )}
      />
      ) : null}

      {isVisible("skilled") ? (
      <Controller
        name="skilled"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-skilled`}
              label="Skilled"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.skilled}
              required={required}
            />
            {errors.skilled ? (
              <p className="mt-1 text-xs text-rose-600">{errors.skilled.message as string}</p>
            ) : null}
          </div>
        )}
      />
      ) : null}

      {isVisible("startDate") ? (
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-start`} className="text-xs font-medium tracking-wide">
          Date you can start
        </label>
        <Input
          id={`${idPrefix}-start`}
          type="date"
          {...register("startDate", requiredRule)}
          required={required}
        />
        {errors.startDate ? (
          <p className="text-xs text-rose-600">{errors.startDate.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("ethnicity") ? (
      <Controller
        name="ethnicity"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-ethnicity`}
              label="Ethnicity"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.ethnicity}
              required={required}
            />
            {errors.ethnicity ? (
              <p className="mt-1 text-xs text-rose-600">{errors.ethnicity.message as string}</p>
            ) : null}
          </div>
        )}
      />
      ) : null}

      {isVisible("educationLevel") ? (
      <Controller
        name="educationLevel"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-edu-level`}
              label="Highest level of education"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.educationLevel}
              required={required}
            />
            {errors.educationLevel ? (
              <p className="mt-1 text-xs text-rose-600">
                {errors.educationLevel.message as string}
              </p>
            ) : null}
          </div>
        )}
      />
      ) : null}

      {isVisible("usWorkEligible") ? (
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide">
          Are you eligible to work in the United States?
        </p>
        <Controller
          name="usWorkEligible"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <Select
              value={field.value.trim() ? field.value : SELECT_NONE}
              onValueChange={(value) => field.onChange(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {resolvedOptions.usWorkEligible.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.usWorkEligible ? (
          <p className="text-xs text-rose-600">{errors.usWorkEligible.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("veteran") ? (
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide">Are you a veteran?</p>
        <Controller
          name="veteran"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <Select
              value={field.value.trim() ? field.value : SELECT_NONE}
              onValueChange={(value) => field.onChange(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {resolvedOptions.veteran.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.veteran ? (
          <p className="text-xs text-rose-600">{errors.veteran.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("secondChance") ? (
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide">
          Are you a second chance job seeker?
        </p>
        <Controller
          name="secondChance"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <Select
              value={field.value.trim() ? field.value : SELECT_NONE}
              onValueChange={(value) => field.onChange(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {resolvedOptions.secondChance.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.secondChance ? (
          <p className="text-xs text-rose-600">{errors.secondChance.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("transportation") ? (
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide">Do you have reliable transportation?</p>
        <Controller
          name="transportation"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <Select
              value={field.value.trim() ? field.value : SELECT_NONE}
              onValueChange={(value) => field.onChange(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {resolvedOptions.transportation.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.transportation ? (
          <p className="text-xs text-rose-600">{errors.transportation.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("workSchedule") ? (
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide">
          Are you looking for full-time or part-time work
        </p>
        <Controller
          name="workSchedule"
          control={control}
          rules={requiredRule}
          render={({ field }) => (
            <Select
              value={field.value.trim() ? field.value : SELECT_NONE}
              onValueChange={(value) => field.onChange(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                {resolvedOptions.workSchedule.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.workSchedule ? (
          <p className="text-xs text-rose-600">{errors.workSchedule.message as string}</p>
        ) : null}
      </div>
      ) : null}

      {isVisible("candidateEducation") ? (
      <Controller
        name="candidateEducation"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-cand-edu`}
              label="Candidate Education"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.candidateEducation}
              required={required}
            />
            {errors.candidateEducation ? (
              <p className="mt-1 text-xs text-rose-600">
                {errors.candidateEducation.message as string}
              </p>
            ) : null}
          </div>
        )}
      />
      ) : null}

      {isVisible("desiredHourlyWage") ? (
      <Controller
        name="desiredHourlyWage"
        control={control}
        rules={requiredRule}
        render={({ field }) => (
          <div>
            <CreatableCombo
              id={`${idPrefix}-wage`}
              label="Desired Hourly Wage"
              value={field.value}
              onChange={field.onChange}
              options={resolvedOptions.desiredHourlyWage}
              required={required}
            />
            {errors.desiredHourlyWage ? (
              <p className="mt-1 text-xs text-rose-600">
                {errors.desiredHourlyWage.message as string}
              </p>
            ) : null}
          </div>
        )}
      />
      ) : null}
    </>
  );
}
