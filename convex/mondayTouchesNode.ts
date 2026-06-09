"use node";

import { v } from "convex/values";

import { mondayAction } from "./lib/mondayFunctions";
import {
  hasMondayTouchConfig,
  listMondayTouchBoardRecordsImpl,
  upsertMondayTouchRecordImpl,
} from "./lib/mondayTouchesImpl";

const parseLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(Math.floor(value!), 1), 500);
};

const parseIsoDateOnly = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const touchRecordValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.union(v.string(), v.null()),
  groupTitle: v.union(v.string(), v.null()),
  statusText: v.union(v.string(), v.null()),
  peopleText: v.union(v.string(), v.null()),
  ownerIds: v.array(v.string()),
  ownerProfiles: v.array(
    v.object({
      id: v.string(),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      photoThumb: v.union(v.string(), v.null()),
    }),
  ),
  email: v.union(v.string(), v.null()),
  phone: v.union(v.string(), v.null()),
  address: v.union(v.string(), v.null()),
  referredToContractors: v.union(v.string(), v.null()),
  interviewingWithContractors: v.union(v.string(), v.null()),
  hiredWithContractor: v.union(v.string(), v.null()),
  hireDate: v.union(v.string(), v.null()),
  retentionPeriod: v.union(v.string(), v.null()),
  tags: v.union(v.string(), v.null()),
  createdAt: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  lastTouchpointAt: v.union(v.string(), v.null()),
  contactDetails: v.array(
    v.object({
      label: v.string(),
      value: v.string(),
    }),
  ),
  resumeFiles: v.array(
    v.object({
      assetId: v.union(v.string(), v.null()),
      name: v.string(),
      url: v.union(v.string(), v.null()),
    }),
  ),
});

/** GET /api/monday/touches */
export const listTouches = mondayAction({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    owner: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  returns: v.object({
    boardName: v.union(v.string(), v.null()),
    records: v.array(touchRecordValidator),
    nextCursor: v.union(v.string(), v.null()),
    appliedFilters: v.optional(
      v.object({
        date: v.boolean(),
        owner: v.boolean(),
      }),
    ),
  }),
  handler: async (_ctx, _identity, args) => {
    if (!hasMondayTouchConfig()) {
      throw new Error(
        "Missing Monday touch configuration. Set MONDAY_API_KEY and MONDAY_CONTACT_TOUCHED_BOARD_ID.",
      );
    }

    const limit = parseLimit(args.limit);
    const search = args.search?.trim().toLowerCase() ?? "";
    const owner = args.owner?.trim().toLowerCase() ?? "";
    const dateFrom = parseIsoDateOnly(args.dateFrom);
    const dateTo = parseIsoDateOnly(args.dateTo);

    const { records, nextCursor, boardName, appliedFilters } =
      await listMondayTouchBoardRecordsImpl({
        cursor: args.cursor,
        limit,
        dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
        dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
        owner: owner || undefined,
      });

    const filtered = records.filter((record) => {
      if (search.length > 0) {
        const haystack = [
          record.name,
          record.id,
          record.peopleText ?? "",
          record.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (owner.length > 0 && !appliedFilters?.owner) {
        const peopleTextValue = (record.peopleText ?? "").toLowerCase();
        const ownerIds = record.ownerIds.map((id) => id.toLowerCase());
        if (!ownerIds.includes(owner) && peopleTextValue !== owner) return false;
      }

      if ((dateFrom || dateTo) && !appliedFilters?.date) {
        const createdAt = record.createdAt ? new Date(record.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
          if (createdAt > end) return false;
        }
      }

      return true;
    });

    return {
      boardName,
      records: filtered,
      nextCursor,
      appliedFilters,
    };
  },
});

/** POST /api/monday/touches */
export const createTouch = mondayAction({
  args: {
    contactItemId: v.string(),
    contactName: v.string(),
    ownerId: v.string(),
    source: v.optional(v.string()),
  },
  returns: v.object({
    id: v.union(v.string(), v.null()),
    upserted: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("skipped"),
    ),
  }),
  handler: async (_ctx, _identity, args) => {
    if (!hasMondayTouchConfig()) {
      throw new Error("Missing Monday touch configuration");
    }

    const contactItemId = args.contactItemId.trim();
    const contactName = args.contactName.trim();
    const ownerId = args.ownerId.trim();
    if (!contactItemId || !contactName || !ownerId) {
      throw new Error(
        "Missing required fields: contactItemId, contactName, ownerId",
      );
    }

    return upsertMondayTouchRecordImpl({
      contactItemId,
      contactName,
      ownerId,
      source: args.source?.trim() || "update",
    });
  },
});
