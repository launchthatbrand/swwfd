import { NextResponse } from "next/server";

import { findMondayContactsByEmail } from "~/server/monday/client";
import {
  getQuestionnaireForContact,
  parseQuestionnaireBody,
  saveQuestionnaireToContact,
} from "~/server/monday/questionnaire";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const pickBestMatchByEmail = async (email: string) => {
  const matches = await findMondayContactsByEmail(email, 20);
  const normalizedEmail = normalizeEmail(email);
  const exactMatches = matches.filter(
    (entry) => normalizeEmail(entry.email ?? "") === normalizedEmail,
  );
  if (exactMatches.length === 0) return null;
  return [...exactMatches].sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bTime - aTime;
  })[0];
};

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return toJson({ ok: false, error: "Missing email query parameter" }, 400);
  }

  try {
    const match = await pickBestMatchByEmail(email);
    if (!match) {
      return toJson({ ok: false, error: "No contact found for this email" }, 404);
    }
    return toJson({
      ok: true,
      contact: {
        id: match.id,
        name: match.name,
        email: match.email,
      },
      questionnaire: await getQuestionnaireForContact(match.id),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to look up contact by email";
    return toJson({ ok: false, error: message }, 500);
  }
};

export const POST = async (request: Request) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!rawBody || typeof rawBody !== "object") {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const payload = rawBody as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const submissionMode =
    payload.submissionMode === "partial" || payload.submissionMode === "complete"
      ? payload.submissionMode
      : "complete";
  if (!email) {
    return toJson({ ok: false, error: "Email is required" }, 400);
  }

  try {
    const match = await pickBestMatchByEmail(email);
    if (!match) {
      return toJson({ ok: false, error: "No contact found for this email" }, 404);
    }
    const body = parseQuestionnaireBody(payload);
    await saveQuestionnaireToContact({
      itemId: match.id,
      body,
      actorMondayUserId: null,
      markComplete: submissionMode === "complete",
    });
    return toJson({
      ok: true,
      mode: submissionMode,
      contact: {
        id: match.id,
        name: match.name,
        email: match.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save questionnaire";
    return toJson({ ok: false, error: message }, 500);
  }
};
