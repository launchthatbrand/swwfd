import { callMondayGraphQL } from "./mondayGraphQL";

export type MondayEmailTemplate = {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
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
    const directAssetUrls = parsedAssetIds
      .map((assetId) => assetUrlById[assetId])
      .filter((assetUrl): assetUrl is string => typeof assetUrl === "string")
      .map((assetUrl) => assetUrl.trim())
      .filter((assetUrl) => assetUrl.length > 0);
    const extractedImageUrls = extractLikelyImageUrls(parsed);
    const imageUrls = Array.from(
      new Set(
        (directAssetUrls.length > 0 ? directAssetUrls : extractedImageUrls).map((imageUrl) =>
          imageUrl.trim(),
        ),
      ),
    ).filter((imageUrl) => imageUrl.length > 0);

    if (blockType.includes("image") && imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        htmlParts.push(
          `<img src="${escapeHtml(imageUrl)}" alt="Email image" style="max-width: 100%; height: auto; border-radius: 8px;" />`,
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

  return { text: textParts.join("\n\n"), html: htmlParts.join("\n") };
};

const fetchDocBodyByObjectId = async (objectId: string) => {
  interface DocData {
    docs?: { blocks?: MondayDocBlock[] }[];
  }
  const data = await callMondayGraphQL<DocData>(
    `query GetDocBody($objectIds: [ID!]) {
      docs(object_ids: $objectIds, limit: 1) {
        blocks { id type content }
      }
    }`,
    { objectIds: [objectId] },
  );
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
    interface AssetsData {
      assets?: Array<{ id?: string; public_url?: string | null; url?: string | null }>;
    }
    try {
      const assetsData = await callMondayGraphQL<AssetsData>(
        `query GetAssets($assetIds: [ID!]!) {
          assets(ids: $assetIds) { id public_url url }
        }`,
        { assetIds },
      );
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

export const listMondayEmailTemplatesImpl = async (args?: {
  boardId?: string;
  cursor?: string;
  limit?: number;
  workdocColumnId?: string;
  statusColumnId?: string;
  readyStatusLabel?: string;
}) => {
  const fallbackBoardId = process.env.MONDAY_EMAIL_TEMPLATES_BOARD_ID ?? "18401299370";
  const boardId = args?.boardId?.trim() || fallbackBoardId;
  if (!boardId) {
    throw new Error("Missing email templates board id");
  }

  const workdocColumnId = args?.workdocColumnId?.trim() || "doc_mm0wq4r";
  const statusColumnId = args?.statusColumnId?.trim() || "color_mm16fvtn";
  const readyStatusLabel = (args?.readyStatusLabel?.trim() || "Done").toLowerCase();
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
  const sourceItems = data.boards?.[0]?.items_page?.items ?? [];
  const readyItems = sourceItems.filter((item) => {
    const statusColumn = item.column_values?.find((column) => column.id === statusColumnId);
    const statusText = statusColumn?.text?.trim().toLowerCase() ?? "";
    if (statusText === readyStatusLabel) return true;
    const statusValue = parseJsonIfString(statusColumn?.value);
    if (!statusValue || typeof statusValue !== "object") return false;
    const statusRecord = statusValue as {
      label?: unknown;
      labels?: unknown;
      index?: unknown;
    };
    if (
      typeof statusRecord.label === "string" &&
      statusRecord.label.trim().toLowerCase() === readyStatusLabel
    ) {
      return true;
    }
    if (Array.isArray(statusRecord.labels)) {
      return statusRecord.labels.some(
        (entry) =>
          typeof entry === "string" &&
          entry.trim().toLowerCase() === readyStatusLabel,
      );
    }
    return false;
  });

  const templates = readyItems.map((item) => {
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
    };
  });

  const hydratedTemplates = await Promise.all(
    templates.map(async (template) => {
      const item = readyItems.find(
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
