"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { Button } from "@launchthatapp/ui/button";
import { toast } from "@launchthatapp/ui/toast";

import {
  EMPTY_QUESTIONNAIRE_VALUES,
  QuestionaireForm,
  type QuestionnaireFormValues,
} from "~/components/forms/questionaire-form";

interface ResolvedContact {
  id: string;
  name: string;
  email: string | null;
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
    defaultValues: EMPTY_QUESTIONNAIRE_VALUES,
  });

  const {
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
      reset(EMPTY_QUESTIONNAIRE_VALUES);
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
          <QuestionaireForm form={form} requireAllFields />

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
