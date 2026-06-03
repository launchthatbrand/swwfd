"use node";

import { v } from "convex/values";

import { callMondayGraphQL, getMondayApiKey } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const mondayContactCandidateValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  owner: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
});

// ---------------------------------------------------------------------------
// Env + helpers
// ---------------------------------------------------------------------------

const getMondayBoardEnv = () => {
  getMondayApiKey();
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) {
    throw new Error(
      "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
    );
  }
  return { boardId };
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const resolveBoardCreateColumnIds = async (boardId: string) => {
  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
      }>;
    }>;
  }

  const data = await callMondayGraphQL<BoardColumnsData>(
    `query ResolveBoardCreateColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title type }
      }
    }`,
    { boardId },
  );

  const columns = data.boards?.[0]?.columns ?? [];
  const normalized = columns.map((column) => ({
    id: column.id ?? "",
    type: (column.type ?? "").toLowerCase(),
    title: (column.title ?? "").toLowerCase(),
  }));

  const byType = (type: string) =>
    normalized.find((column) => column.type === type)?.id || null;
  const byTitleIncludes = (needle: string) =>
    normalized.find((column) => column.title.includes(needle))?.id || null;

  return {
    emailColumnId: byType("email") ?? "email__1",
    peopleColumnId: byType("people"),
    addressColumnId:
      byTitleIncludes("address") ??
      byTitleIncludes("street") ??
      "text6__1",
    firstNameColumnId: byTitleIncludes("first name"),
    lastNameColumnId: byTitleIncludes("last name"),
  };
};

const findMondayContactsByEmailImpl = async (email: string, limit = 15) => {
  const { boardId } = getMondayBoardEnv();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];

  const columnIds = await resolveBoardCreateColumnIds(boardId);
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  interface BoardItem {
    id: string;
    name?: string;
    url?: string | null;
    updated_at?: string | null;
    column_values?: Array<{
      id?: string | null;
      type?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }
  interface QueryData {
    boards?: Array<{
      items_page?: { items?: BoardItem[] };
    }>;
  }

  const data = await callMondayGraphQL<QueryData>(
    `query FindContactsByEmail($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        items_page(
          limit: $limit
          query_params: {
            rules: [{
              column_id: "${columnIds.emailColumnId}"
              compare_value: [${JSON.stringify(normalizedEmail)}]
              operator: any_of
            }]
          }
        ) {
          items {
            id
            name
            url
            updated_at
            column_values { id type text value }
          }
        }
      }
    }`,
    { boardId, limit: safeLimit },
  );

  const rows = data.boards?.[0]?.items_page?.items ?? [];
  return rows
    .map((row) => {
      const emailValue =
        row.column_values?.find((column) => column.id === columnIds.emailColumnId)
          ?.text ?? null;
      const ownerValue =
        row.column_values?.find((column) => column.type === "people")?.text ?? null;
      return {
        id: row.id,
        name: row.name ?? "",
        url: row.url ?? null,
        email: emailValue,
        owner: ownerValue,
        updatedAt: row.updated_at ?? null,
      };
    })
    .filter((row) => normalizeEmail(row.email ?? "") === normalizedEmail)
    .slice(0, safeLimit);
};

const createMondayContactImpl = async (args: {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  ownerId: string;
}) => {
  const { boardId } = getMondayBoardEnv();

  const firstName = args.firstName.trim();
  const lastName = args.lastName.trim();
  const email = args.email.trim();
  const address = args.address.trim();
  const ownerId = args.ownerId.trim();

  if (!firstName || !lastName || !email || !ownerId) {
    throw new Error("Missing required contact fields");
  }

  const columnIds = await resolveBoardCreateColumnIds(boardId);
  const itemName = `${firstName} ${lastName}`.trim();
  const columnValues: Record<string, unknown> = {};

  if (columnIds.emailColumnId) {
    columnValues[columnIds.emailColumnId] = { email, text: email };
  }
  if (columnIds.addressColumnId && address) {
    columnValues[columnIds.addressColumnId] = address;
  }
  if (columnIds.firstNameColumnId) {
    columnValues[columnIds.firstNameColumnId] = firstName;
  }
  if (columnIds.lastNameColumnId) {
    columnValues[columnIds.lastNameColumnId] = lastName;
  }
  if (columnIds.peopleColumnId) {
    columnValues[columnIds.peopleColumnId] = {
      personsAndTeams: [{ id: Number(ownerId), kind: "person" }],
    };
  }

  const result = await callMondayGraphQL<{ create_item?: { id?: string } }>(
    `mutation CreateMondayContact(
      $boardId: ID!
      $itemName: String!
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) { id }
    }`,
    {
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  );

  const id = result.create_item?.id;
  if (!id) throw new Error("Failed to create monday contact");
  return { id };
};

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/** GET /api/monday/contacts — find contacts by email */
export const findContacts = mondayAction({
  args: { email: v.string() },
  returns: v.object({
    identity: v.object({ userId: v.string() }),
    existing: v.array(mondayContactCandidateValidator),
  }),
  handler: async (_ctx, identity: MondaySessionIdentity, args) => {
    const email = normalizeEmail(args.email);
    if (!email) throw new Error("Missing email query");

    const existing = await findMondayContactsByEmailImpl(email);
    return {
      identity: { userId: identity.userId },
      existing,
    };
  },
});

/** POST /api/monday/contacts — create a new Monday contact */
export const createContact = mondayAction({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    ownerId: v.optional(v.string()),
  },
  returns: v.object({
    created: v.object({ id: v.string() }),
  }),
  handler: async (_ctx, identity: MondaySessionIdentity, args) => {
    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    const email = normalizeEmail(args.email);
    const address = args.address?.trim() ?? "";
    const ownerId = args.ownerId?.trim() || identity.userId;

    if (!firstName || !lastName || !email) {
      throw new Error("Missing required contact fields");
    }

    const created = await createMondayContactImpl({
      firstName,
      lastName,
      email,
      address,
      ownerId,
    });
    return { created };
  },
});
