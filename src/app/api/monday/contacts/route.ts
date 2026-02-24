import { NextResponse } from "next/server";

import {
  createMondayContact,
  findMondayContactsByEmail,
  hasMondayConfig,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeEmail = (value: string | null) => value?.trim().toLowerCase() ?? "";

export const GET = async (request: Request) => {
  let identity: Awaited<ReturnType<typeof requireVerifiedMondaySession>>;
  try {
    identity = await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  if (!hasMondayConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email) {
    return toJson({ ok: false, error: "Missing email query" }, 400);
  }

  try {
    const existing = await findMondayContactsByEmail(email);
    return toJson({
      ok: true,
      identity: { userId: identity.userId },
      existing,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to look up existing contacts";
    return toJson({ ok: false, error: message }, 500);
  }
};

interface CreateContactBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  ownerId?: string;
}

export const POST = async (request: Request) => {
  let identity: Awaited<ReturnType<typeof requireVerifiedMondaySession>>;
  try {
    identity = await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  if (!hasMondayConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  let body: CreateContactBody;
  try {
    body = (await request.json()) as CreateContactBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = normalizeEmail(body.email ?? null);
  const address = body.address?.trim() ?? "";
  const ownerId = body.ownerId?.trim() || identity.userId;

  if (!firstName || !lastName || !email) {
    return toJson({ ok: false, error: "Missing required contact fields" }, 400);
  }

  try {
    const created = await createMondayContact({
      firstName,
      lastName,
      email,
      address,
      ownerId,
    });
    return toJson({
      ok: true,
      created,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create monday contact";
    return toJson({ ok: false, error: message }, 500);
  }
};
