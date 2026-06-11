import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const GLOBAL_SETTINGS_KEY = "global";
const DEFAULT_EMAIL_MARKETING_ENABLED = false;
const MASTER_ADMIN_USER_ID = "53441186";
const DEFAULT_ADMIN_USER_IDS = ["38959704", MASTER_ADMIN_USER_ID];

const normalizeUserIds = (values: string[]) => {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
};

const normalizeEmails = (values: string[]) => {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );
};

const normalizeNullableEmail = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidMonthKey = (value: string) => /^\d{4}-\d{2}$/.test(value);

const normalizeMonthlyBoardMappings = (
  values: Array<{ monthKey: string; boardId: string }>,
) => {
  const deduped = new Map<string, { monthKey: string; boardId: string }>();
  for (const entry of values) {
    const monthKey = entry.monthKey.trim();
    const boardId = entry.boardId.trim();
    if (!isValidMonthKey(monthKey) || boardId.length === 0) continue;
    deduped.set(monthKey, { monthKey, boardId });
  }
  return Array.from(deduped.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
};

const EMAIL_SYSTEM_TAG_PATTERN = /^[a-z][a-z0-9_.-]*$/;

const normalizeEmailSystemTags = (
  values: Array<{ tag: string; columnId: string; columnTitle: string }>,
) => {
  const deduped = new Map<string, { tag: string; columnId: string; columnTitle: string }>();
  for (const entry of values) {
    const tag = entry.tag.trim().toLowerCase();
    const columnId = entry.columnId.trim();
    const columnTitle = entry.columnTitle.trim();
    if (!EMAIL_SYSTEM_TAG_PATTERN.test(tag)) continue;
    if (!/^[a-zA-Z0-9_]+$/.test(columnId)) continue;
    const key = `${tag}:${columnId}`;
    deduped.set(key, {
      tag,
      columnId,
      columnTitle: columnTitle.length > 0 ? columnTitle : columnId,
    });
  }
  return Array.from(deduped.values()).sort((a, b) => a.tag.localeCompare(b.tag));
};

export const getFeatureFlags = query({
  args: {},
  returns: v.object({
    emailMarketingEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    return {
      emailMarketingEnabled:
        settings?.emailMarketingEnabled ?? DEFAULT_EMAIL_MARKETING_ENABLED,
    };
  },
});

export const getPlatformSettings = query({
  args: {},
  returns: v.object({
    masterAdminUserId: v.string(),
    adminUserIds: v.array(v.string()),
    employeeUserIds: v.array(v.string()),
    replyToEmails: v.array(v.string()),
    zohoSenderEmail: v.union(v.string(), v.null()),
    zohoReplyToFallbackEmail: v.union(v.string(), v.null()),
    emailSystemTags: v.array(
      v.object({
        tag: v.string(),
        columnId: v.string(),
        columnTitle: v.string(),
      }),
    ),
    monthlyBoardMappings: v.array(
      v.object({
        monthKey: v.string(),
        boardId: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    return {
      masterAdminUserId: MASTER_ADMIN_USER_ID,
      adminUserIds: normalizeUserIds(settings?.adminUserIds ?? DEFAULT_ADMIN_USER_IDS),
      employeeUserIds: normalizeUserIds(settings?.employeeUserIds ?? []),
      replyToEmails: normalizeEmails(settings?.replyToEmails ?? []),
      zohoSenderEmail: normalizeNullableEmail(settings?.zohoSenderEmail),
      zohoReplyToFallbackEmail: normalizeNullableEmail(
        settings?.zohoReplyToFallbackEmail,
      ),
      emailSystemTags: normalizeEmailSystemTags(settings?.emailSystemTags ?? []),
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        settings?.monthlyBoardMappings ?? [],
      ),
    };
  },
});

export const setFeatureFlags = mutation({
  args: {
    emailMarketingEnabled: v.boolean(),
    updatedByMondayUserId: v.string(),
  },
  returns: v.object({
    emailMarketingEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        emailMarketingEnabled: args.emailMarketingEnabled,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    } else {
      await ctx.db.insert("mondayGlobalSettings", {
        key: GLOBAL_SETTINGS_KEY,
        emailMarketingEnabled: args.emailMarketingEnabled,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    }

    return {
      emailMarketingEnabled: args.emailMarketingEnabled,
    };
  },
});

export const setPlatformSettings = mutation({
  args: {
    adminUserIds: v.array(v.string()),
    employeeUserIds: v.array(v.string()),
    replyToEmails: v.array(v.string()),
    zohoSenderEmail: v.union(v.string(), v.null()),
    zohoReplyToFallbackEmail: v.union(v.string(), v.null()),
    emailSystemTags: v.array(
      v.object({
        tag: v.string(),
        columnId: v.string(),
        columnTitle: v.string(),
      }),
    ),
    monthlyBoardMappings: v.array(
      v.object({
        monthKey: v.string(),
        boardId: v.string(),
      }),
    ),
    updatedByMondayUserId: v.string(),
  },
  returns: v.object({
    masterAdminUserId: v.string(),
    adminUserIds: v.array(v.string()),
    employeeUserIds: v.array(v.string()),
    replyToEmails: v.array(v.string()),
    zohoSenderEmail: v.union(v.string(), v.null()),
    zohoReplyToFallbackEmail: v.union(v.string(), v.null()),
    emailSystemTags: v.array(
      v.object({
        tag: v.string(),
        columnId: v.string(),
        columnTitle: v.string(),
      }),
    ),
    monthlyBoardMappings: v.array(
      v.object({
        monthKey: v.string(),
        boardId: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    const adminUserIds = normalizeUserIds([
      ...args.adminUserIds,
      MASTER_ADMIN_USER_ID,
    ]);
    const employeeUserIds = normalizeUserIds(args.employeeUserIds);
    const replyToEmails = normalizeEmails(args.replyToEmails);
    const zohoSenderEmail = normalizeNullableEmail(args.zohoSenderEmail);
    const zohoReplyToFallbackEmail = normalizeNullableEmail(
      args.zohoReplyToFallbackEmail,
    );
    const emailSystemTags = normalizeEmailSystemTags(args.emailSystemTags);
    const monthlyBoardMappings = normalizeMonthlyBoardMappings(
      args.monthlyBoardMappings,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        adminUserIds,
        employeeUserIds,
        replyToEmails,
        zohoSenderEmail,
        zohoReplyToFallbackEmail,
        emailSystemTags,
        monthlyBoardMappings,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    } else {
      await ctx.db.insert("mondayGlobalSettings", {
        key: GLOBAL_SETTINGS_KEY,
        emailMarketingEnabled: DEFAULT_EMAIL_MARKETING_ENABLED,
        adminUserIds,
        employeeUserIds,
        replyToEmails,
        zohoSenderEmail,
        zohoReplyToFallbackEmail,
        emailSystemTags,
        monthlyBoardMappings,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    }

    return {
      masterAdminUserId: MASTER_ADMIN_USER_ID,
      adminUserIds,
      employeeUserIds,
      replyToEmails,
      zohoSenderEmail,
      zohoReplyToFallbackEmail,
      emailSystemTags,
      monthlyBoardMappings,
    };
  },
});
