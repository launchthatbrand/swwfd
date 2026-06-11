import { v } from "convex/values";
import { mutation } from "./_generated/server";

const providerValidator = v.union(v.literal("outlook"), v.literal("zoho"));
const reasonValidator = v.union(
  v.literal("single_outlook"),
  v.literal("single_fallback_zoho"),
  v.literal("multi_zoho"),
);
const statusValidator = v.union(
  v.literal("sent"),
  v.literal("failed"),
  v.literal("partial"),
);

const normalizeRequired = (value: string) => value.trim();
const normalizeOptional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};
const normalizeAppClientId = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const record = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayAppClientId: v.optional(v.string()),
    actingMondayUserId: v.string(),
    provider: providerValidator,
    reason: reasonValidator,
    recipientCount: v.number(),
    sentCount: v.number(),
    failedCount: v.number(),
    contactItemIds: v.array(v.string()),
    ownerMondayUserIds: v.array(v.string()),
    subject: v.string(),
    status: statusValidator,
    errorMessage: v.optional(v.string()),
  },
  returns: v.object({
    eventId: v.id("emailSendEvents"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const eventId = await ctx.db.insert("emailSendEvents", {
      mondayAccountId: normalizeRequired(args.mondayAccountId),
      mondayAppClientId: normalizeAppClientId(args.mondayAppClientId),
      actingMondayUserId: normalizeRequired(args.actingMondayUserId),
      provider: args.provider,
      reason: args.reason,
      recipientCount: Math.max(0, Math.floor(args.recipientCount)),
      sentCount: Math.max(0, Math.floor(args.sentCount)),
      failedCount: Math.max(0, Math.floor(args.failedCount)),
      contactItemIds: args.contactItemIds.map((entry) => normalizeRequired(entry)),
      ownerMondayUserIds: args.ownerMondayUserIds.map((entry) =>
        normalizeRequired(entry),
      ),
      subject: normalizeRequired(args.subject),
      status: args.status,
      errorMessage: normalizeOptional(args.errorMessage),
      createdAt: now,
    });
    return { eventId };
  },
});
