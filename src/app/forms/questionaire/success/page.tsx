"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@launchthatapp/ui/button";

export default function QuestionaireSuccessPage() {
  const searchParams = useSearchParams();
  const name = (searchParams.get("name") ?? "").trim();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Questionnaire Submitted</h1>
        <p className="mt-3 text-sm text-slate-600">
          {name
            ? `Thanks, ${name}. Your screening form has been submitted successfully.`
            : "Thanks. Your screening form has been submitted successfully."}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Our team has received your responses and will review them shortly.
        </p>

        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
