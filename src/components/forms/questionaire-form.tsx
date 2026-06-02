"use client";

import { useMemo, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";

import {
  QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS,
  QUESTIONNAIRE_SKILLED_OPTIONS,
  QUESTIONNAIRE_TRANSPORTATION,
  QUESTIONNAIRE_WORK_SCHEDULE,
  QUESTIONNAIRE_YES_NO,
} from "~/app/monday/constants";

const SELECT_NONE = "__none__";
const REQUIRED_MESSAGE = "This field is required";

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

export function QuestionaireForm({
  form,
  requireAllFields = false,
  idPrefix = "q",
}: {
  form: UseFormReturn<QuestionnaireFormValues>;
  requireAllFields?: boolean;
  idPrefix?: string;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const requiredRule = requireAllFields ? { required: REQUIRED_MESSAGE } : undefined;
  const required = requireAllFields;

  return (
    <>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-gender`} className="text-xs font-medium tracking-wide">
          Gender
        </label>
        <Input
          id={`${idPrefix}-gender`}
          {...register("gender", requiredRule)}
          required={required}
        />
        {errors.gender ? (
          <p className="text-xs text-rose-600">{errors.gender.message as string}</p>
        ) : null}
      </div>

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
              options={QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS}
              required={required}
            />
            {errors.entryLevel ? (
              <p className="mt-1 text-xs text-rose-600">{errors.entryLevel.message as string}</p>
            ) : null}
          </div>
        )}
      />

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
              options={QUESTIONNAIRE_SKILLED_OPTIONS}
              required={required}
            />
            {errors.skilled ? (
              <p className="mt-1 text-xs text-rose-600">{errors.skilled.message as string}</p>
            ) : null}
          </div>
        )}
      />

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

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-ethnicity`} className="text-xs font-medium tracking-wide">
          Ethnicity
        </label>
        <Input
          id={`${idPrefix}-ethnicity`}
          {...register("ethnicity", requiredRule)}
          required={required}
        />
        {errors.ethnicity ? (
          <p className="text-xs text-rose-600">{errors.ethnicity.message as string}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-edu-level`} className="text-xs font-medium tracking-wide">
          Highest level of education
        </label>
        <Input
          id={`${idPrefix}-edu-level`}
          {...register("educationLevel", requiredRule)}
          required={required}
        />
        {errors.educationLevel ? (
          <p className="text-xs text-rose-600">{errors.educationLevel.message as string}</p>
        ) : null}
      </div>

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
                {QUESTIONNAIRE_YES_NO.map((option) => (
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
                {QUESTIONNAIRE_YES_NO.map((option) => (
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
                {QUESTIONNAIRE_YES_NO.map((option) => (
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
                {QUESTIONNAIRE_TRANSPORTATION.map((option) => (
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
                {QUESTIONNAIRE_WORK_SCHEDULE.map((option) => (
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

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-cand-edu`} className="text-xs font-medium tracking-wide">
          Candidate Education
        </label>
        <Input
          id={`${idPrefix}-cand-edu`}
          {...register("candidateEducation", requiredRule)}
          required={required}
        />
        {errors.candidateEducation ? (
          <p className="text-xs text-rose-600">{errors.candidateEducation.message as string}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-wage`} className="text-xs font-medium tracking-wide">
          Desired Hourly Wage
        </label>
        <Input
          id={`${idPrefix}-wage`}
          {...register("desiredHourlyWage", requiredRule)}
          required={required}
        />
        {errors.desiredHourlyWage ? (
          <p className="text-xs text-rose-600">{errors.desiredHourlyWage.message as string}</p>
        ) : null}
      </div>
    </>
  );
}
