import { NextResponse } from "next/server";

import {
  callMondayGraphQL,
  createMondayRecordUpdate,
  listMondayRecordUpdates,
  updateMondayRecordFields,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface MergeRecordsBody {
  masterItemId?: string;
  sourceItemIds?: string[];
  fieldOverrides?: {
    ownerId?: string | null;
    status?: string | null;
    tags?: string[] | null;
    referredToContractors?: string[] | null;
    interviewingWithContractors?: string[] | null;
    hiredWithContractor?: string | null;
    hireDate?: string | null;
    retentionPeriod?: string | null;
  };
  deleteSources?: boolean;
}

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const toDateOnly = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed.replace(" UTC", "Z"));
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
};

const dedupeKeyForSubitem = (subitem: {
  name: string;
  updateType: string;
  methodOfCommunication: string | null;
  createdAt: string | null;
}) => {
  const dateOnly = toDateOnly(subitem.createdAt);
  return [
    normalizeText(subitem.updateType),
    normalizeText(subitem.name),
    normalizeText(subitem.methodOfCommunication),
    dateOnly,
  ].join("::");
};

const deleteMondayItem = async (itemId: string) => {
  interface DeleteData {
    delete_item?: { id?: string | number | null } | null;
  }
  await callMondayGraphQL<DeleteData>(
    `mutation DeleteItem($itemId: ID!) { delete_item(item_id: $itemId) { id } }`,
    { itemId },
  );
};

export const POST = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  let payload: MergeRecordsBody;
  try {
    payload = (await request.json()) as MergeRecordsBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const masterItemId = payload.masterItemId?.trim() ?? "";
  const sourceItemIds = (payload.sourceItemIds ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== masterItemId);
  const uniqueSourceItemIds = Array.from(new Set(sourceItemIds));
  const uniqueTotal = Array.from(new Set([masterItemId, ...uniqueSourceItemIds])).filter(
    (value) => value.length > 0,
  );

  if (!masterItemId) {
    return toJson({ ok: false, error: "Missing masterItemId" }, 400);
  }
  if (uniqueSourceItemIds.length === 0) {
    return toJson({ ok: false, error: "Select at least one source record to merge" }, 400);
  }
  if (uniqueTotal.length < 2 || uniqueTotal.length > 4) {
    return toJson({ ok: false, error: "You can merge between 2 and 4 records at once" }, 400);
  }

  const fieldOverrides = payload.fieldOverrides ?? {};
  const updateArgs: Parameters<typeof updateMondayRecordFields>[0] = {
    itemId: masterItemId,
  };
  let hasFieldOverride = false;
  const assignOverride = <TKey extends keyof Omit<typeof updateArgs, "itemId">>(
    key: TKey,
    value: (typeof updateArgs)[TKey] | undefined,
  ) => {
    if (value === undefined) return;
    hasFieldOverride = true;
    updateArgs[key] = value;
  };
  assignOverride("ownerId", fieldOverrides.ownerId ?? undefined);
  assignOverride("status", fieldOverrides.status ?? undefined);
  assignOverride("tags", fieldOverrides.tags ?? undefined);
  assignOverride("referredToContractors", fieldOverrides.referredToContractors ?? undefined);
  assignOverride(
    "interviewingWithContractors",
    fieldOverrides.interviewingWithContractors ?? undefined,
  );
  assignOverride("hiredWithContractor", fieldOverrides.hiredWithContractor ?? undefined);
  assignOverride("hireDate", fieldOverrides.hireDate ?? undefined);
  assignOverride("retentionPeriod", fieldOverrides.retentionPeriod ?? undefined);

  try {
    if (hasFieldOverride) {
      await updateMondayRecordFields(updateArgs);
    }

    const masterUpdates = await listMondayRecordUpdates({ itemId: masterItemId, limit: 200 });
    const existingKeys = new Set(
      (masterUpdates.subitems ?? []).map((subitem) => dedupeKeyForSubitem(subitem)),
    );

    let createdSubitems = 0;
    let skippedDuplicates = 0;
    const mergedSourceNames: string[] = [];

    for (const sourceItemId of uniqueSourceItemIds) {
      const sourceUpdates = await listMondayRecordUpdates({ itemId: sourceItemId, limit: 200 });
      const sourceName = sourceUpdates.itemName?.trim();
      mergedSourceNames.push(sourceName && sourceName.length > 0 ? sourceName : sourceItemId);
      const sourceSubitems = [...(sourceUpdates.subitems ?? [])].sort((a, b) => {
        const aTime = Date.parse(a.createdAt ?? "");
        const bTime = Date.parse(b.createdAt ?? "");
        return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
      });

      for (const subitem of sourceSubitems) {
        const key = dedupeKeyForSubitem(subitem);
        if (existingKeys.has(key)) {
          skippedDuplicates += 1;
          continue;
        }
        await createMondayRecordUpdate({
          itemId: masterItemId,
          body: subitem.name?.trim() || "General Update",
          updateType: subitem.updateType,
          date: toDateOnly(subitem.createdAt) || undefined,
          methodOfCommunication: subitem.methodOfCommunication ?? undefined,
          subitemNameOverride: subitem.name?.trim() || "General Update",
          suppressApprovalStepMarking: true,
        });
        existingKeys.add(key);
        createdSubitems += 1;
      }
    }

    const shouldDeleteSources = payload.deleteSources !== false;
    let deletedSourceCount = 0;
    if (shouldDeleteSources) {
      for (const sourceItemId of uniqueSourceItemIds) {
        await deleteMondayItem(sourceItemId);
        deletedSourceCount += 1;
      }
    }

    const mergeSummaryLines = [
      `Merged ${uniqueSourceItemIds.length} duplicate contact${uniqueSourceItemIds.length === 1 ? "" : "s"} into this master record.`,
      `Sources: ${mergedSourceNames.join(", ")}`,
      `Copied updates: ${createdSubitems}`,
      `Skipped duplicate updates: ${skippedDuplicates}`,
    ];
    await createMondayRecordUpdate({
      itemId: masterItemId,
      body: mergeSummaryLines.join("\n"),
      updateType: "merge",
      subitemNameOverride: "Contact Merged",
      suppressApprovalStepMarking: true,
    });

    return toJson({
      ok: true,
      mergedInto: masterItemId,
      mergedSourceCount: uniqueSourceItemIds.length,
      createdSubitems,
      skippedDuplicates,
      deletedSourceCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to merge selected records";
    return toJson({ ok: false, error: message }, 500);
  }
};
