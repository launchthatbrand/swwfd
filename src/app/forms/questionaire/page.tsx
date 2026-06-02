"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { Button } from "@launchthatapp/ui/button";
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
  QUESTIONNAIRE_WORK_SCHEDULE,
  QUESTIONNAIRE_YES_NO,
} from "~/app/monday/constants";

const SELECT_NONE = "__none__";

interface QuestionnaireFormValues {
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

interface ResolvedContact {
  id: string;
  name: string;
  email: string | null;
}

function CreatableCombo({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  id: string;
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

export default function PublicQuestionairePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = (searchParams.get("email") ?? "").trim();
  const [resolvedContact, setResolvedContact] = useState<ResolvedContact | null>(null);
  const [isResolvingContact, setIsResolvingContact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<QuestionnaireFormValues>({
    defaultValues: EMPTY_VALUES,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
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
        };
        if (!response.ok || !data.ok || !data.contact) {
          throw new Error(data.error ?? "Unable to find your contact record");
        }
        setResolvedContact(data.contact);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to find your contact record";
        setResolvedContact(null);
        toast.error(message);
      } finally {
        setIsResolvingContact(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!emailParam) {
      setResolvedContact(null);
      return;
    }
    void resolveContactByEmail(emailParam);
  }, [emailParam, resolveContactByEmail]);

  const onSubmit = handleSubmit(async (values) => {
    const trimmedEmail = emailParam.trim();
    if (!trimmedEmail) {
      toast.error("Invalid questionnaire link: missing email");
      return;
    }
    if (!resolvedContact) {
      toast.error("Unable to resolve contact for this questionnaire link");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/forms/questionaire", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          ...values,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        contact?: ResolvedContact;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to submit questionnaire");
      }
      if (data.contact) {
        setResolvedContact(data.contact);
      }
      setIsSubmitted(true);
      reset(EMPTY_VALUES);
      toast.success("Screening questionnaire submitted");
      const successParams = new URLSearchParams();
      if (trimmedEmail) {
        successParams.set("email", trimmedEmail);
      }
      if (data.contact?.name?.trim()) {
        successParams.set("name", data.contact.name.trim());
      }
      const nextUrl = successParams.toString()
        ? `/forms/questionaire/success?${successParams.toString()}`
        : "/forms/questionaire/success";
      router.push(nextUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit questionnaire";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Screening Questionnaire</h1>
          <p className="text-sm text-slate-600">
            Complete this form to update your contact record and mark screening as complete.
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

        {isSubmitted ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Thanks. Your screening responses were submitted successfully.
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
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
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide">Are you a veteran?</p>
            <Controller
              name="veteran"
              control={control}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset(EMPTY_VALUES);
              }}
              disabled={isSubmitting || !isDirty}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting || !emailParam || !resolvedContact}>
              {isSubmitting ? "Submitting..." : "Submit Screening"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
