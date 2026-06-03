"use node";

import { v } from "convex/values";

import { callMondayGraphQL } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";

const HELPDESK_COL = {
  priority: "color_mm2yp484",
  category: "color_mm2ygxja",
  description: "long_text_mm2y9acp",
  linkedContact: "text_mm2y39n9",
  person: "person",
  status: "status",
  date: "date4",
} as const;

const HELPDESK_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  contact_issue: "Contact Issue",
  technical: "Technical",
  data_sync: "Data / Sync",
  other: "Other",
};

const helpdeskTicketValidator = v.object({
  id: v.string(),
  name: v.string(),
  status: v.union(v.string(), v.null()),
  priority: v.union(v.string(), v.null()),
  category: v.union(v.string(), v.null()),
  description: v.union(v.string(), v.null()),
  linkedContact: v.union(v.string(), v.null()),
  date: v.union(v.string(), v.null()),
  createdAt: v.union(v.string(), v.null()),
});

const getHelpdeskBoardId = () => {
  const boardId = process.env.MONDAY_HELPDESK_BOARD_ID?.trim();
  if (!boardId) throw new Error("MONDAY_HELPDESK_BOARD_ID is not configured");
  return boardId;
};

/** GET /api/monday/helpdesk */
export const listTickets = mondayAction({
  args: { submitterId: v.optional(v.string()) },
  returns: v.object({ tickets: v.array(helpdeskTicketValidator) }),
  handler: async (_ctx, _identity, args) => {
    const boardId = getHelpdeskBoardId();
    const colIds = [
      HELPDESK_COL.status,
      HELPDESK_COL.priority,
      HELPDESK_COL.category,
      HELPDESK_COL.description,
      HELPDESK_COL.linkedContact,
      HELPDESK_COL.date,
      HELPDESK_COL.person,
    ];

    const data = await callMondayGraphQL<{
      boards?: Array<{
        items_page?: {
          items?: Array<{
            id?: string;
            name?: string;
            created_at?: string;
            column_values?: Array<{ id?: string; text?: string | null }>;
          }>;
        };
      }>;
    }>(
      `query ($boardId: ID!, $colIds: [String!]) {
        boards(ids: [$boardId]) {
          items_page(limit: 200) {
            items {
              id name created_at
              column_values(ids: $colIds) { id text }
            }
          }
        }
      }`,
      { boardId, colIds },
    );

    const items = data.boards?.[0]?.items_page?.items ?? [];
    const tickets = items.map((item) => {
      const colText = (colId: string) =>
        item.column_values?.find((c) => c.id === colId)?.text?.trim() || null;
      return {
        id: String(item.id ?? ""),
        name: item.name ?? "",
        status: colText(HELPDESK_COL.status),
        priority: colText(HELPDESK_COL.priority),
        category: colText(HELPDESK_COL.category),
        description: colText(HELPDESK_COL.description),
        linkedContact: colText(HELPDESK_COL.linkedContact),
        date: colText(HELPDESK_COL.date),
        createdAt: item.created_at ?? null,
      };
    });

    if (args.submitterId) {
      const submitterId = args.submitterId;
      return {
        tickets: tickets.filter((ticket) => {
          const raw = items.find((entry) => String(entry.id) === ticket.id);
          const personText =
            raw?.column_values?.find((c) => c.id === HELPDESK_COL.person)?.text ?? "";
          return personText.includes(submitterId);
        }),
      };
    }

    return { tickets };
  },
});

/** POST /api/monday/helpdesk */
export const createTicket = mondayAction({
  args: {
    subject: v.string(),
    description: v.string(),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
    linkedContactId: v.optional(v.string()),
    linkedContactName: v.optional(v.string()),
    submitterId: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.literal(true),
    itemId: v.union(v.string(), v.null()),
  }),
  handler: async (_ctx, _identity, args) => {
    const boardId = getHelpdeskBoardId();
    const subject = args.subject.trim();
    const description = args.description.trim();
    if (!subject) throw new Error("Subject is required");
    if (!description) throw new Error("Description is required");

    const priority = args.priority ?? "medium";
    const category = args.category ?? "general";
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
    const categoryLabel = HELPDESK_CATEGORY_LABELS[category] ?? "General";
    const today = new Date().toISOString().slice(0, 10);

    const columnValues: Record<string, unknown> = {
      [HELPDESK_COL.description]: { text: description },
      [HELPDESK_COL.priority]: { label: priorityLabel },
      [HELPDESK_COL.category]: { label: categoryLabel },
      [HELPDESK_COL.status]: { label: "Working on it" },
      [HELPDESK_COL.date]: { date: today },
    };

    if (args.linkedContactId) {
      columnValues[HELPDESK_COL.linkedContact] = args.linkedContactName
        ? `${args.linkedContactName} (${args.linkedContactId})`
        : args.linkedContactId;
    }
    if (args.submitterId) {
      columnValues[HELPDESK_COL.person] = {
        personsAndTeams: [{ id: Number(args.submitterId), kind: "person" }],
      };
    }

    const data = await callMondayGraphQL<{ create_item?: { id?: string | null } }>(
      `mutation CreateHelpdeskTicket($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }`,
      {
        boardId,
        itemName: subject,
        columnValues: JSON.stringify(columnValues),
      },
    );

    return { ok: true as const, itemId: data.create_item?.id ?? null };
  },
});
