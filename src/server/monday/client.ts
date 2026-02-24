import "server-only";

import { env } from "~/env";

const MONDAY_API_URL = "https://api.monday.com/v2";

export interface MondayRecord {
  id: string;
  name: string;
  url: string | null;
  groupTitle: string | null;
  statusText: string | null;
  peopleText: string | null;
  ownerIds: string[];
  email: string | null;
  address: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactDetails: Array<{
    label: string;
    value: string;
  }>;
}

export interface MondayEmailTemplate {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
}

export interface MondayUserProfile {
  id: string;
  email: string | null;
  name: string | null;
}

interface MondayGraphQLResponse<TData> {
  data?: TData;
  errors?: { message?: string }[];
}

const getMondayApiEnv = () => {
  const apiKey = env.MONDAY_API_KEY;
  if (!apiKey) {
    return { ok: false as const, apiKey: null };
  }
  return { ok: true as const, apiKey };
};

const getMondayBoardEnv = () => {
  const api = getMondayApiEnv();
  const boardId = env.MONDAY_BOARD_ID;
  if (!api.ok || !boardId) {
    return { ok: false as const, apiKey: null, boardId: null };
  }
  return { ok: true as const, apiKey: api.apiKey, boardId };
};

const callMondayGraphQL = async <TData>(
  query: string,
  variables: Record<string, unknown>,
) => {
  const mondayApi = getMondayApiEnv();
  if (!mondayApi.ok) {
    throw new Error("MONDAY_API_KEY is missing");
  }

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: mondayApi.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monday API request failed with ${response.status}`);
  }

  const json = (await response.json()) as MondayGraphQLResponse<TData>;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message =
      json.errors.map((error) => error.message).filter(Boolean).join(" | ") ||
      "Unknown Monday API error";
    throw new Error(message);
  }

  if (!json.data) {
    throw new Error("Monday API returned no data");
  }

  return json.data;
};

const extractPrimitiveStrings = (input: unknown): string[] => {
  if (input === null || input === undefined) return [];
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return [String(input)];
  }
  if (Array.isArray(input)) {
    return input.flatMap((entry) => extractPrimitiveStrings(entry));
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).flatMap((entry) =>
      extractPrimitiveStrings(entry),
    );
  }
  return [];
};

const toColumnDisplayValue = (
  text: string | null | undefined,
  rawValue: string | null | undefined,
) => {
  const normalizedText = text?.trim();
  if (normalizedText && normalizedText.length > 0) {
    return normalizedText;
  }
  if (!rawValue || rawValue.trim().length === 0) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const values = Array.from(new Set(extractPrimitiveStrings(parsed))).filter(
      (value) => value.toLowerCase() !== "person",
    );
    return values.join(", ");
  } catch {
    return rawValue;
  }
};

export const hasMondayConfig = () => {
  return getMondayBoardEnv().ok;
};

export const listMondayBoardRecords = async (args?: {
  cursor?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    return {
      records: [] as MondayRecord[],
      nextCursor: null as string | null,
      boardName: null as string | null,
    };
  }

  const dateFromArg = args?.dateFrom;
  const dateToArg = args?.dateTo;
  const cursorArg = args?.cursor ?? null;
  const shouldFilterByDateRange =
    typeof dateFromArg === "string" &&
    dateFromArg.length > 0 &&
    typeof dateToArg === "string" &&
    dateToArg.length > 0;
  const isIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const listBoardItemsQuery = `
    query ListBoardItems($boardId: ID!, $limit: Int!, $cursor: String) {
      boards(ids: [$boardId]) {
        name
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            url
            updated_at
            group {
              title
            }
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  const listBoardItemsByDateRangeQuery = (dateFrom: string, dateTo: string) => `
    query ListBoardItemsByDateRange($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          query_params: {
            rules: [
              {
                column_id: "date1__1"
                compare_value: ["${dateFrom}", "${dateTo}"]
                operator: between
              }
            ]
          }
        ) {
          cursor
          items {
            id
            name
            url
            updated_at
            group {
              title
            }
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  interface BoardItem {
    id: string;
    name?: string;
    url?: string;
    updated_at?: string;
    group?: { title?: string | null } | null;
    column_values?: {
      id?: string;
      type?: string;
      text?: string | null;
      value?: string | null;
    }[];
  }

  interface BoardQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }[];
  }

  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);

  let boardName: string | null = null;
  const readCreatedAtFromCreationLog = (
    value: string | null | undefined,
    text: string | null | undefined,
  ) => {
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value) as { created_at?: unknown };
        if (typeof parsed.created_at === "string" && parsed.created_at.length > 0) {
          return parsed.created_at;
        }
      } catch {
        // Fall through to text parsing.
      }
    }

    if (typeof text === "string" && text.length > 0) {
      const fromText = Date.parse(text.replace(" UTC", "Z"));
      if (!Number.isNaN(fromText)) {
        return new Date(fromText).toISOString();
      }
    }

    return null;
  };

  const toRecord = (item: BoardItem): MondayRecord => {
    const columns = item.column_values ?? [];
    const statusColumn = columns.find((column) => column.type === "status");
    const peopleColumn = columns.find((column) => column.type === "people");
    const emailColumn = columns.find(
      (column) => column.id === "email__1" || column.type === "email",
    );
    const addressLine1 = columns.find((column) => column.id === "text6__1")?.text;
    const addressLine2 = columns.find((column) => column.id === "text60__1")?.text;
    const city = columns.find((column) => column.id === "text1__1")?.text;
    const state = columns.find((column) => column.id === "text7__1")?.text;
    const zip = columns.find((column) => column.id === "text3__1")?.text;
    const dateColumn = columns.find((column) => column.id === "date1__1");
    const creationLogColumn = columns.find(
      (column) => column.type === "creation_log",
    );
    let createdAtFromDateColumn: string | null = null;
    if (dateColumn?.value) {
      try {
        const parsed = JSON.parse(dateColumn.value) as {
          date?: string;
          time?: string;
        };
        if (parsed.date && parsed.time) {
          createdAtFromDateColumn = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          createdAtFromDateColumn = `${parsed.date}T00:00:00Z`;
        }
      } catch {
        // Ignore malformed date JSON.
      }
    }
    const createdAtFromColumn = readCreatedAtFromCreationLog(
      creationLogColumn?.value,
      creationLogColumn?.text,
    );
    const addressParts = [addressLine1, addressLine2, city, state, zip]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value && value.length > 0);
    const address = addressParts.length > 0 ? addressParts.join(", ") : null;

    let ownerIds: string[] = [];
    if (peopleColumn?.value) {
      try {
        const parsed = JSON.parse(peopleColumn.value) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        ownerIds = (parsed.personsAndTeams ?? [])
          .filter((entry) => entry.kind === "person" && entry.id != null)
          .map((entry) =>
            typeof entry.id === "number" ? String(entry.id) : String(entry.id),
          )
          .filter((entry) => entry.trim().length > 0);
      } catch {
        ownerIds = [];
      }
    }

    const primaryDetails: Array<{ label: string; value: string }> = [];
    if ((item.name ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Name", value: item.name ?? "" });
    }
    if ((emailColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Email", value: emailColumn?.text ?? "" });
    }
    if ((address ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Address", value: address ?? "" });
    }
    if ((peopleColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Owner", value: peopleColumn?.text ?? "" });
    }
    if ((statusColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Status", value: statusColumn?.text ?? "" });
    }
    if ((item.group?.title ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Group", value: item.group?.title ?? "" });
    }

    const allColumnDetails = columns
      .filter((column) => {
        const id = column.id ?? "";
        if (!id) return false;
        if (column.type === "creation_log") return false;
        const displayValue = toColumnDisplayValue(column.text, column.value);
        return displayValue.trim().length > 0;
      })
      .map((column) => ({
        label: column.id ?? "field",
        value: toColumnDisplayValue(column.text, column.value),
      }));

    const detailsByLabel = new Map<string, string>();
    for (const detail of [...primaryDetails, ...allColumnDetails]) {
      if (!detailsByLabel.has(detail.label)) {
        detailsByLabel.set(detail.label, detail.value);
      }
    }
    const contactDetails = Array.from(detailsByLabel.entries()).map(
      ([label, value]) => ({ label, value }),
    );

    return {
      id: item.id,
      name: item.name ?? "",
      url: item.url ?? null,
      groupTitle: item.group?.title ?? null,
      statusText: statusColumn?.text ?? null,
      peopleText: peopleColumn?.text ?? null,
      ownerIds,
      email: emailColumn?.text ?? null,
      address,
      createdAt:
        createdAtFromDateColumn ?? createdAtFromColumn ?? item.updated_at ?? null,
      updatedAt: item.updated_at ?? null,
      contactDetails,
    };
  };

  const shouldRunDateRuleOnInitialPage =
    shouldFilterByDateRange &&
    !cursorArg &&
    isIsoDateOnly(dateFromArg) &&
    isIsoDateOnly(dateToArg);

  const data = shouldRunDateRuleOnInitialPage
    ? await callMondayGraphQL<BoardQueryData>(
        listBoardItemsByDateRangeQuery(dateFromArg, dateToArg),
        {
          boardId: mondayBoard.boardId,
          limit,
        },
      )
    : await callMondayGraphQL<BoardQueryData>(listBoardItemsQuery, {
        boardId: mondayBoard.boardId,
        limit,
        cursor: cursorArg,
      });

  boardName = data.boards?.[0]?.name ?? null;
  const nextCursor = data.boards?.[0]?.items_page?.cursor ?? null;
  const firstItems = data.boards?.[0]?.items_page?.items ?? [];
  const records = firstItems.map(toRecord);

  return {
    records,
    nextCursor,
    boardName,
  };
};

const extractWorkdocContent = (
  value: string | null | undefined,
  text: string | null | undefined,
) => {
  if (typeof text === "string" && text.trim().length > 0) {
    return text.trim();
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const directCandidates = [
      parsed.content,
      parsed.text,
      parsed.plain_text,
      parsed.body,
      parsed.value,
      parsed.html,
    ];
    for (const candidate of directCandidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const extractStringValuesDeep = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractStringValuesDeep(entry));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      extractStringValuesDeep(entry),
    );
  }
  return [];
};

const extractLikelyImageUrls = (value: unknown): string[] => {
  const strings = extractStringValuesDeep(value);
  return strings.filter((entry) =>
    /^(https?:)?\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(entry),
  );
};

const extractAssetIdsDeep = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractAssetIdsDeep(entry));
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directAssetId = record.assetId;
    const direct = [
      typeof directAssetId === "number"
        ? String(directAssetId)
        : typeof directAssetId === "string"
          ? directAssetId
          : null,
    ].filter((entry): entry is string => !!entry && entry.trim().length > 0);
    return [
      ...direct,
      ...Object.values(record).flatMap((entry) => extractAssetIdsDeep(entry)),
    ];
  }
  return [];
};

const parseJsonIfString = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

interface ParsedWorkdocMeta {
  objectId: string | null;
  linkToFile: string | null;
}

const parseWorkdocMeta = (
  value: string | null | undefined,
): ParsedWorkdocMeta => {
  if (!value || value.trim().length === 0) {
    return { objectId: null, linkToFile: null };
  }
  try {
    const parsed = JSON.parse(value) as {
      files?: Array<{
        objectId?: number | string;
        linkToFile?: string;
        fileType?: string;
      }>;
    };
    const file = parsed.files?.find(
      (entry) => entry.fileType === "MONDAY_DOC" || entry.objectId != null,
    );
    if (!file) return { objectId: null, linkToFile: null };
    const objectId =
      typeof file.objectId === "number"
        ? String(file.objectId)
        : typeof file.objectId === "string" && file.objectId.trim().length > 0
          ? file.objectId.trim()
          : null;
    const linkToFile =
      typeof file.linkToFile === "string" && file.linkToFile.trim().length > 0
        ? file.linkToFile.trim()
        : null;
    return { objectId, linkToFile };
  } catch {
    return { objectId: null, linkToFile: null };
  }
};

interface MondayDocBlock {
  id?: string;
  type?: string | null;
  content?: string | null;
}

const renderDocBlocks = (
  blocks: MondayDocBlock[],
  assetUrlById: Record<string, string>,
): { text: string; html: string } => {
  const textParts: string[] = [];
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const raw = block.content ?? "";
    if (raw.trim().length === 0) continue;
    const blockType = (block.type ?? "").toLowerCase();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    const parsedRecord =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;

    const parsedAssetIds = extractAssetIdsDeep(parsed);
    const proxyUrls = parsedAssetIds.map(
      (assetId) => `/api/monday/email-templates/assets/${encodeURIComponent(assetId)}`,
    );
    const imageUrls =
      proxyUrls.length > 0
        ? proxyUrls
        : extractLikelyImageUrls(parsed).map((imageUrl) => {
            const replacement = parsedAssetIds
              .map((assetId) => assetUrlById[assetId])
              .find((value) => typeof value === "string" && value.length > 0);
            return replacement ?? imageUrl;
          });

    if (blockType.includes("image") && imageUrls.length > 0) {
      const alignmentValue =
        typeof parsedRecord?.alignment === "string"
          ? parsedRecord.alignment.toLowerCase()
          : "left";
      const justifyStyle =
        alignmentValue === "center"
          ? "justify-content: center;"
          : alignmentValue === "right"
            ? "justify-content: flex-end;"
            : "justify-content: flex-start;";
      const widthPercentageRaw = parsedRecord?.widthPercentage;
      const widthPercentage =
        typeof widthPercentageRaw === "string" || typeof widthPercentageRaw === "number"
          ? Number(widthPercentageRaw)
          : NaN;
      const widthStyle =
        Number.isFinite(widthPercentage) && widthPercentage > 0 && widthPercentage <= 1
          ? `width: ${(widthPercentage * 100).toFixed(2)}%; `
          : "";

      for (const imageUrl of imageUrls) {
        htmlParts.push(
          `<div style="display: flex; ${justifyStyle}"><img src="${escapeHtml(imageUrl)}" alt="Email image" style="${widthStyle}max-width: 100%; height: auto; border-radius: 8px;" /></div>`,
        );
      }
      continue;
    }

    let textChunks: string[] = [];
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "deltaFormat" in (parsed as Record<string, unknown>) &&
      Array.isArray((parsed as { deltaFormat?: unknown[] }).deltaFormat)
    ) {
      const delta = (parsed as { deltaFormat: unknown[] }).deltaFormat;
      textChunks = delta
        .map((entry) => {
          if (typeof entry !== "object" || entry === null) return "";
          const insertValue = (entry as { insert?: unknown }).insert;
          return typeof insertValue === "string" ? insertValue : "";
        })
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    } else {
      textChunks = extractStringValuesDeep(parsed).filter(
        (chunk) =>
          !/^https?:\/\//i.test(chunk) &&
          !chunk.startsWith("{") &&
          !chunk.startsWith("[") &&
          !["left", "right", "center", "ltr", "rtl"].includes(chunk.toLowerCase()),
      );
    }

    if (textChunks.length > 0) {
      const paragraph = textChunks.join(" ").trim();
      if (paragraph.length > 0) {
        textParts.push(paragraph);
        htmlParts.push(`<p>${escapeHtml(paragraph)}</p>`);
      }
    }

    for (const imageUrl of imageUrls) {
      htmlParts.push(
        `<img src="${escapeHtml(imageUrl)}" alt="Email image" style="max-width: 100%; height: auto; border-radius: 8px;" />`,
      );
    }
  }

  const text = textParts.join("\n\n");
  const html = htmlParts.join("\n");
  return { text, html };
};

const fetchDocBodyByObjectId = async (objectId: string) => {
  const query = `
    query GetDocBody($objectIds: [ID!]) {
      docs(object_ids: $objectIds, limit: 1) {
        blocks {
          id
          type
          content
        }
      }
    }
  `;

  interface DocData {
    docs?: {
      blocks?: MondayDocBlock[];
    }[];
  }

  const data = await callMondayGraphQL<DocData>(query, {
    objectIds: [objectId],
  });
  const blocks = data.docs?.[0]?.blocks ?? [];
  const assetIds = Array.from(
    new Set(
      blocks.flatMap((block) =>
        extractAssetIdsDeep(parseJsonIfString(block.content ?? "")),
      ),
    ),
  );

  let assetUrlById: Record<string, string> = {};
  if (assetIds.length > 0) {
    const assetQuery = `
      query GetAssets($assetIds: [ID!]!) {
        assets(ids: $assetIds) {
          id
          public_url
          url
        }
      }
    `;
    interface AssetsData {
      assets?: Array<{ id?: string; public_url?: string | null; url?: string | null }>;
    }
    try {
      const assetsData = await callMondayGraphQL<AssetsData>(assetQuery, { assetIds });
      assetUrlById = Object.fromEntries(
        (assetsData.assets ?? [])
          .map((asset) => {
            const id = asset.id?.trim();
            if (!id) return null;
            const url = asset.public_url ?? asset.url ?? "";
            return [id, url] as const;
          })
          .filter((entry): entry is readonly [string, string] => !!entry),
      );
    } catch {
      assetUrlById = {};
    }
  }

  return renderDocBlocks(blocks, assetUrlById);
};

export const listMondayEmailTemplates = async (args?: {
  boardId?: string;
  cursor?: string;
  limit?: number;
  workdocColumnId?: string;
}) => {
  const fallbackBoardId = env.MONDAY_EMAIL_TEMPLATES_BOARD_ID ?? "18401299370";
  const boardId = args?.boardId?.trim() || fallbackBoardId;
  if (!boardId) {
    throw new Error("Missing email templates board id");
  }

  const workdocColumnId = args?.workdocColumnId?.trim() || "doc_mm0wq4r";
  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);

  const query = `
    query ListEmailTemplates($boardId: ID!, $limit: Int!, $cursor: String) {
      boards(ids: [$boardId]) {
        name
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            url
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  interface BoardItem {
    id: string;
    name?: string;
    url?: string;
    updated_at?: string;
    column_values?: {
      id?: string;
      text?: string | null;
      value?: string | null;
    }[];
  }
  interface TemplatesQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }[];
  }

  const data = await callMondayGraphQL<TemplatesQueryData>(query, {
    boardId,
    limit,
    cursor: args?.cursor ?? null,
  });

  const boardName = data.boards?.[0]?.name ?? null;
  const nextCursor = data.boards?.[0]?.items_page?.cursor ?? null;
  const templates = (data.boards?.[0]?.items_page?.items ?? []).map((item) => {
    const workdocMeta = parseWorkdocMeta(
      item.column_values?.find((column) => column.id === workdocColumnId)?.value,
    );
    return {
      id: item.id,
      name: item.name ?? `Template ${item.id}`,
      url: item.url ?? null,
      updatedAt: item.updated_at ?? null,
      content: "",
      renderedHtml: "",
      docLink: workdocMeta.linkToFile,
    } satisfies MondayEmailTemplate;
  });

  const hydratedTemplates = await Promise.all(
    templates.map(async (template) => {
      const item = (data.boards?.[0]?.items_page?.items ?? []).find(
        (entry) => entry.id === template.id,
      );
      const workdocColumn = item?.column_values?.find(
        (column) => column.id === workdocColumnId,
      );
      const workdocMeta = parseWorkdocMeta(workdocColumn?.value);
      const fallbackContent = extractWorkdocContent(workdocColumn?.value, workdocColumn?.text);

      if (!workdocMeta.objectId) {
        return {
          ...template,
          content: fallbackContent,
          renderedHtml:
            fallbackContent.trim().length > 0
              ? `<div style="white-space: pre-wrap;">${escapeHtml(fallbackContent)}</div>`
              : "",
          docLink: workdocMeta.linkToFile,
        };
      }

      try {
        const rendered = await fetchDocBodyByObjectId(workdocMeta.objectId);
        const resolvedText =
          rendered.text.trim().length > 0 ? rendered.text : fallbackContent;
        const resolvedHtml =
          rendered.html.trim().length > 0
            ? rendered.html
            : `<div style="white-space: pre-wrap;">${escapeHtml(resolvedText)}</div>`;

        return {
          ...template,
          content: resolvedText,
          renderedHtml: resolvedHtml,
          docLink: workdocMeta.linkToFile,
        };
      } catch {
        return {
          ...template,
          content: fallbackContent,
          renderedHtml:
            fallbackContent.trim().length > 0
              ? `<div style="white-space: pre-wrap;">${escapeHtml(fallbackContent)}</div>`
              : "",
          docLink: workdocMeta.linkToFile,
        };
      }
    }),
  );

  return {
    boardName,
    templates: hydratedTemplates,
    nextCursor,
    boardId,
    workdocColumnId,
  };
};

export const getMondayUserProfile = async (userId: string) => {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("Missing userId");
  }

  const query = `
    query GetMondayUser($userIds: [ID!]) {
      users(ids: $userIds) {
        id
        email
        name
      }
    }
  `;

  interface UserData {
    users?: Array<{ id?: string; email?: string | null; name?: string | null }>;
  }

  const data = await callMondayGraphQL<UserData>(query, {
    userIds: [trimmedUserId],
  });
  const user = data.users?.[0];
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  } satisfies MondayUserProfile;
};

