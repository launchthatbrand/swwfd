"use node";

import { v } from "convex/values";

import { mondayAction } from "./lib/mondayFunctions";
import { listMondayEmailTemplatesImpl } from "./lib/mondayEmailTemplatesImpl";

const emailTemplateValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  content: v.string(),
  renderedHtml: v.string(),
  docLink: v.union(v.string(), v.null()),
});

const parseLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(Math.floor(value!), 1), 500);
};

/** GET /api/monday/email-templates */
export const listTemplates = mondayAction({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    boardId: v.optional(v.string()),
    workdocColumnId: v.optional(v.string()),
  },
  returns: v.object({
    boardName: v.union(v.string(), v.null()),
    templates: v.array(emailTemplateValidator),
    nextCursor: v.union(v.string(), v.null()),
    boardId: v.string(),
    workdocColumnId: v.string(),
  }),
  handler: async (_ctx, _identity, args) => {
    const result = await listMondayEmailTemplatesImpl({
      cursor: args.cursor,
      limit: parseLimit(args.limit),
      boardId: args.boardId,
      workdocColumnId: args.workdocColumnId,
    });
    return {
      boardName: result.boardName,
      templates: result.templates,
      nextCursor: result.nextCursor,
      boardId: result.boardId,
      workdocColumnId: result.workdocColumnId,
    };
  },
});
