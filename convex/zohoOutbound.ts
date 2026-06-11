import { v } from "convex/values";
import { mutation } from "./_generated/server";

const normalizeRequired = (value: string) => value.trim();
const normalizeOptional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};
const normalizeAppClientId = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const recordSendResult = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayAppClientId: v.optional(v.string()),
    actingMondayUserId: v.string(),
    ownerMondayUserId: v.string(),
    ownerEmail: v.optional(v.string()),
    contactItemId: v.string(),
    recipientEmail: v.string(),
    subject: v.string(),
    senderEmail: v.optional(v.string()),
    replyToEmail: v.optional(v.string()),
    zohoMessageId: v.optional(v.string()),
    zohoCampaignId: v.optional(v.string()),
    status: v.union(v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    sentAt: v.number(),
  },
  returns: v.object({
    outboundMessageId: v.id("zohoOutboundMessages"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const outboundMessageId = await ctx.db.insert("zohoOutboundMessages", {
      mondayAccountId: normalizeRequired(args.mondayAccountId),
      mondayAppClientId: normalizeAppClientId(args.mondayAppClientId),
      actingMondayUserId: normalizeRequired(args.actingMondayUserId),
      ownerMondayUserId: normalizeRequired(args.ownerMondayUserId),
      ownerEmail: normalizeOptional(args.ownerEmail),
      contactItemId: normalizeRequired(args.contactItemId),
      recipientEmail: normalizeRequired(args.recipientEmail).toLowerCase(),
      subject: normalizeRequired(args.subject),
      senderEmail: normalizeOptional(args.senderEmail)?.toLowerCase() ?? null,
      replyToEmail: normalizeOptional(args.replyToEmail)?.toLowerCase() ?? null,
      zohoMessageId: normalizeOptional(args.zohoMessageId),
      zohoCampaignId: normalizeOptional(args.zohoCampaignId),
      status: args.status,
      errorMessage: normalizeOptional(args.errorMessage),
      sentAt: args.sentAt,
      createdAt: now,
      updatedAt: now,
    });
    return { outboundMessageId };
  },
});
