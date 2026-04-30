import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

type AdvancedFilterMatchMode = "all" | "any";

type AdvancedFilterField =
  | "owner"
  | "district"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "tags"
  | "createdAt"
  | "hireDate"
  | "detail";

type AdvancedFilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "on_or_after"
  | "on_or_before"
  | "between";

interface AdvancedFilterCondition {
  id: string;
  field: AdvancedFilterField;
  operator: AdvancedFilterOperator;
  value: string;
  valueTo: string;
  target: string;
}

interface UpsertPresetBody {
  ownerId?: string;
  presetId?: string;
  name?: string;
  matchMode?: AdvancedFilterMatchMode;
  conditions?: AdvancedFilterCondition[];
}

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const FILTER_FIELDS: AdvancedFilterField[] = [
  "owner",
  "district",
  "name",
  "email",
  "phone",
  "address",
  "tags",
  "createdAt",
  "hireDate",
  "detail",
];

const FILTER_OPERATORS: AdvancedFilterOperator[] = [
  "contains",
  "equals",
  "not_equals",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "on_or_after",
  "on_or_before",
  "between",
];

const isFilterField = (value: unknown): value is AdvancedFilterField => {
  return typeof value === "string" && FILTER_FIELDS.includes(value as AdvancedFilterField);
};

const isFilterOperator = (value: unknown): value is AdvancedFilterOperator => {
  return (
    typeof value === "string" &&
    FILTER_OPERATORS.includes(value as AdvancedFilterOperator)
  );
};

const isMatchMode = (value: unknown): value is AdvancedFilterMatchMode => {
  return value === "all" || value === "any";
};

const normalizeCondition = (input: unknown): AdvancedFilterCondition | null => {
  if (!input || typeof input !== "object") return null;
  const condition = input as Partial<AdvancedFilterCondition>;
  const id = typeof condition.id === "string" ? condition.id.trim() : "";
  const value = typeof condition.value === "string" ? condition.value : "";
  const valueTo = typeof condition.valueTo === "string" ? condition.valueTo : "";
  const target = typeof condition.target === "string" ? condition.target : "";
  if (!id || !isFilterField(condition.field) || !isFilterOperator(condition.operator)) {
    return null;
  }
  return {
    id,
    field: condition.field,
    operator: condition.operator,
    value,
    valueTo,
    target,
  };
};

const normalizeOwnerId = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim();
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const url = new URL(request.url);
    const ownerId = normalizeOwnerId(url.searchParams.get("ownerId"));
    if (!ownerId) {
      return toJson({ ok: false, error: "ownerId is required" }, 400);
    }

    const convex = getConvexHttpClient();
    const presets = await convex.query(
      apiGenerated.mondayUserFilterPresets.listForOwnerBoard,
      {
        accountId: identity.accountId,
        ownerMondayUserId: ownerId,
      },
    );

    return toJson({ ok: true, presets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load filter presets";
    return toJson({ ok: false, error: message }, 500);
  }
};

export const POST = async (request: Request) => {
  let body: UpsertPresetBody = {};
  try {
    body = (await request.json()) as UpsertPresetBody;
  } catch {
    body = {};
  }

  const ownerId = normalizeOwnerId(body.ownerId);
  const presetId = typeof body.presetId === "string" ? body.presetId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const matchMode = body.matchMode;
  const conditionsRaw = Array.isArray(body.conditions) ? body.conditions : [];
  const conditions = conditionsRaw
    .map((condition) => normalizeCondition(condition))
    .filter((condition): condition is AdvancedFilterCondition => condition !== null);

  if (!ownerId) {
    return toJson({ ok: false, error: "ownerId is required" }, 400);
  }
  if (!name) {
    return toJson({ ok: false, error: "name is required" }, 400);
  }
  if (!isMatchMode(matchMode)) {
    return toJson({ ok: false, error: "matchMode must be all or any" }, 400);
  }
  if (conditions.length === 0) {
    return toJson({ ok: false, error: "At least one condition is required" }, 400);
  }

  try {
    const identity = await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const preset = await convex.mutation(
      apiGenerated.mondayUserFilterPresets.upsertForOwnerBoard,
      {
        accountId: identity.accountId,
        ownerMondayUserId: ownerId,
        viewerMondayUserId: identity.userId,
        presetId: presetId || undefined,
        name,
        matchMode,
        conditions,
      },
    );
    return toJson({ ok: true, preset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save filter preset";
    return toJson({ ok: false, error: message }, 500);
  }
};
