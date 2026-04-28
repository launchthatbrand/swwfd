import "server-only";

import { env } from "~/env";

import { upsertMondayTouchRecord, updateMondayRecordFields } from "./client";

const MONDAY_API_URL = "https://api.monday.com/v2";
const ROUTING_CACHE_TTL_MS = 5 * 60 * 1000;
const CONTACT_BOARD_OWNER_COLUMN_FALLBACK = "people__1";

interface MondayColumnValue {
  id?: string | null;
  type?: string | null;
  text?: string | null;
  value?: string | null;
  column?: {
    title?: string | null;
  } | null;
}

type MondayRoutingStatusCode =
  | "assigned"
  | "skipped_owner_exists"
  | "skipped_board_mismatch"
  | "missing_address"
  | "county_not_found"
  | "district_not_mapped"
  | "owner_not_mapped"
  | "config_missing"
  | "error";

export interface MondayDistrictRoutingResult {
  ok: boolean;
  status: MondayRoutingStatusCode;
  itemId: string;
  source: "webhook" | "manual";
  message: string;
  countyName: string | null;
  countyFips: string | null;
  districtCode: string | null;
  ownerId: string | null;
  matchedAddress: string | null;
}

export interface MondayDistrictRoutingStatus {
  ok: boolean;
  enabled: boolean;
  contactBoardId: string | null;
  countyBoardId: string | null;
  districtBoardId: string | null;
  countyMappingsCount: number;
  districtOwnerMappingsCount: number;
  contactBoardUrl: string | null;
  countyBoardUrl: string | null;
  districtBoardUrl: string | null;
  issues: string[];
}

interface MondayRoutingConfig {
  apiKey: string;
  contactBoardId: string;
  countyBoardId: string;
  districtBoardId: string;
  countyNameColumnId: string | null;
  countyDistrictColumnId: string | null;
  countyActiveColumnId: string | null;
  districtCodeColumnId: string | null;
  districtOwnerColumnId: string | null;
  districtActiveColumnId: string | null;
}

interface MondayGraphQLResponse<TData> {
  data?: TData;
  errors?: { message?: string | null }[];
}

interface RoutingContactItem {
  id: string;
  name: string;
  boardId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  ownerIds: string[];
}

interface CountyGeocodeResult {
  countyName: string | null;
  countyFips: string | null;
  matchedAddress: string | null;
}

const countyDistrictCache = new Map<
  string,
  {
    expiresAt: number;
    mappings: Map<string, string>;
  }
>();

const districtOwnerCache = new Map<
  string,
  {
    expiresAt: number;
    mappings: Map<string, string>;
  }
>();

const normalizeValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim();
};

const normalizeColumnId = (value: string | undefined) => {
  const normalized = normalizeValue(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeCountyName = (value: string | null | undefined) => {
  const normalized = normalizeValue(value)
    .replace(/\bcounty\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDistrictCode = (value: string | null | undefined) => {
  const normalized = normalizeValue(value).toUpperCase();
  if (!normalized) return null;
  const exactMatch = /^D\d{1,2}$/.exec(normalized);
  if (exactMatch) return exactMatch[0];
  const looseMatch = /D\s*([0-9]{1,2})/.exec(normalized);
  if (!looseMatch?.[1]) return null;
  return `D${looseMatch[1]}`;
};

const getRoutingConfig = () => {
  const issues: string[] = [];
  const apiKey = normalizeValue(env.MONDAY_API_KEY);
  const contactBoardId = normalizeValue(env.MONDAY_BOARD_ID);
  const countyBoardId = normalizeValue(env.MONDAY_ROUTING_COUNTY_BOARD_ID);
  const districtBoardId = normalizeValue(env.MONDAY_ROUTING_DISTRICT_BOARD_ID);

  if (!apiKey) {
    issues.push("MONDAY_API_KEY is missing");
  }
  if (!contactBoardId) {
    issues.push("MONDAY_BOARD_ID is missing");
  }
  if (!countyBoardId) {
    issues.push("MONDAY_ROUTING_COUNTY_BOARD_ID is missing");
  }
  if (!districtBoardId) {
    issues.push("MONDAY_ROUTING_DISTRICT_BOARD_ID is missing");
  }

  if (issues.length > 0) {
    return {
      ok: false as const,
      issues,
    };
  }

  return {
    ok: true as const,
    config: {
      apiKey,
      contactBoardId,
      countyBoardId,
      districtBoardId,
      countyNameColumnId: normalizeColumnId(env.MONDAY_ROUTING_COUNTY_NAME_COLUMN_ID),
      countyDistrictColumnId: normalizeColumnId(
        env.MONDAY_ROUTING_COUNTY_DISTRICT_COLUMN_ID,
      ),
      countyActiveColumnId: normalizeColumnId(env.MONDAY_ROUTING_COUNTY_ACTIVE_COLUMN_ID),
      districtCodeColumnId: normalizeColumnId(env.MONDAY_ROUTING_DISTRICT_CODE_COLUMN_ID),
      districtOwnerColumnId: normalizeColumnId(env.MONDAY_ROUTING_DISTRICT_OWNER_COLUMN_ID),
      districtActiveColumnId: normalizeColumnId(env.MONDAY_ROUTING_DISTRICT_ACTIVE_COLUMN_ID),
    } satisfies MondayRoutingConfig,
  };
};

const buildBoardUrl = (boardId: string | null) => {
  const normalized = normalizeValue(boardId ?? "");
  if (!normalized) return null;
  return `https://monday.com/boards/${normalized}`;
};

const callMondayGraphQL = async <TData,>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
) => {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
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
    const message = json.errors
      .map((entry) => entry.message ?? "")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(" | ");
    throw new Error(message || "Unknown Monday API error");
  }
  if (!json.data) {
    throw new Error("Monday API returned no data");
  }
  return json.data;
};

const parsePeopleIds = (rawValue: string | null | undefined) => {
  const value = normalizeValue(rawValue);
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value) as {
      personsAndTeams?: { id?: string | number | null; kind?: string | null }[];
    };
    return (parsed.personsAndTeams ?? [])
      .filter((entry) => (entry.kind ?? "").toLowerCase() === "person" && entry.id != null)
      .map((entry) => String(entry.id).trim())
      .filter((entry) => entry.length > 0);
  } catch {
    return [] as string[];
  }
};

const parseBooleanish = (column: MondayColumnValue | null | undefined) => {
  if (!column) return true;

  const textNormalized = normalizeValue(column.text).toLowerCase();
  if (textNormalized) {
    if (["false", "inactive", "disabled", "no", "off", "0"].includes(textNormalized)) {
      return false;
    }
    if (["true", "active", "enabled", "yes", "on", "1"].includes(textNormalized)) {
      return true;
    }
  }

  const valueNormalized = normalizeValue(column.value);
  if (!valueNormalized) return true;

  try {
    const parsed = JSON.parse(valueNormalized) as Record<string, unknown>;
    if (typeof parsed.checked === "string") {
      return parsed.checked === "true";
    }
    if (typeof parsed.checked === "boolean") {
      return parsed.checked;
    }
    if (typeof parsed.label === "string") {
      const label = parsed.label.toLowerCase();
      if (["inactive", "disabled", "false", "no", "off"].includes(label)) return false;
      if (["active", "enabled", "true", "yes", "on"].includes(label)) return true;
    }
    if (typeof parsed.index === "number") {
      return parsed.index !== 0;
    }
  } catch {
    return true;
  }

  return true;
};

const findColumnById = (columns: MondayColumnValue[], columnId: string | null) => {
  if (!columnId) return null;
  return columns.find((column) => normalizeValue(column.id) === columnId) ?? null;
};

const findColumnByType = (columns: MondayColumnValue[], type: string) => {
  const normalizedType = type.toLowerCase();
  return (
    columns.find((column) => normalizeValue(column.type).toLowerCase() === normalizedType) ?? null
  );
};

const findColumnByTitleIncludes = (columns: MondayColumnValue[], needle: string) => {
  const normalizedNeedle = needle.toLowerCase();
  return (
    columns.find((column) => {
      const title = normalizeValue(column.column?.title);
      return title.toLowerCase().includes(normalizedNeedle);
    }) ?? null
  );
};

const getColumnTextValue = (column: MondayColumnValue | null | undefined) => {
  const value = normalizeValue(column?.text);
  return value.length > 0 ? value : null;
};

const getColumnJsonStringValue = (column: MondayColumnValue | null | undefined) => {
  const value = normalizeValue(column?.value);
  return value.length > 0 ? value : null;
};

const getRoutingBoardItems = async (apiKey: string, boardId: string) => {
  interface Data {
    boards?: {
      items_page?: {
        items?: {
          id?: string | number | null;
          name?: string | null;
          column_values?: MondayColumnValue[];
        }[];
      } | null;
    }[];
  }
  const query = `
    query GetRoutingBoardItems($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit) {
          items {
            id
            name
            column_values {
              id
              type
              text
              value
              column {
                title
              }
            }
          }
        }
      }
    }
  `;
  const data = await callMondayGraphQL<Data>(apiKey, query, {
    boardId,
    limit: 500,
  });
  return data.boards?.[0]?.items_page?.items ?? [];
};

const getCountyDistrictMappings = async (config: MondayRoutingConfig) => {
  const cacheKey = JSON.stringify({
    boardId: config.countyBoardId,
    countyNameColumnId: config.countyNameColumnId,
    countyDistrictColumnId: config.countyDistrictColumnId,
    countyActiveColumnId: config.countyActiveColumnId,
  });
  const cached = countyDistrictCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.mappings;
  }

  const rows = await getRoutingBoardItems(config.apiKey, config.countyBoardId);
  const mappings = new Map<string, string>();
  for (const row of rows) {
    const columns = row.column_values ?? [];
    const activeColumn =
      findColumnById(columns, config.countyActiveColumnId) ??
      findColumnByTitleIncludes(columns, "active");
    if (!parseBooleanish(activeColumn)) continue;

    const countyColumn =
      findColumnById(columns, config.countyNameColumnId) ??
      findColumnByTitleIncludes(columns, "county");
    const districtColumn =
      findColumnById(columns, config.countyDistrictColumnId) ??
      findColumnByTitleIncludes(columns, "district");

    const countyName =
      normalizeCountyName(countyColumn?.text) ??
      normalizeCountyName(row.name) ??
      normalizeCountyName(countyColumn?.value);
    const districtCode =
      normalizeDistrictCode(districtColumn?.text) ??
      normalizeDistrictCode(districtColumn?.value);

    if (!countyName || !districtCode) continue;
    mappings.set(countyName, districtCode);
  }

  countyDistrictCache.set(cacheKey, {
    expiresAt: Date.now() + ROUTING_CACHE_TTL_MS,
    mappings,
  });
  return mappings;
};

const getDistrictOwnerMappings = async (config: MondayRoutingConfig) => {
  const cacheKey = JSON.stringify({
    boardId: config.districtBoardId,
    districtCodeColumnId: config.districtCodeColumnId,
    districtOwnerColumnId: config.districtOwnerColumnId,
    districtActiveColumnId: config.districtActiveColumnId,
  });
  const cached = districtOwnerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.mappings;
  }

  const rows = await getRoutingBoardItems(config.apiKey, config.districtBoardId);
  const mappings = new Map<string, string>();
  for (const row of rows) {
    const columns = row.column_values ?? [];
    const activeColumn =
      findColumnById(columns, config.districtActiveColumnId) ??
      findColumnByTitleIncludes(columns, "active");
    if (!parseBooleanish(activeColumn)) continue;

    const districtCodeColumn =
      findColumnById(columns, config.districtCodeColumnId) ??
      findColumnByTitleIncludes(columns, "district");
    const ownerColumn =
      findColumnById(columns, config.districtOwnerColumnId) ??
      findColumnByType(columns, "people") ??
      findColumnById(columns, CONTACT_BOARD_OWNER_COLUMN_FALLBACK);

    const districtCode =
      normalizeDistrictCode(districtCodeColumn?.text) ??
      normalizeDistrictCode(row.name) ??
      normalizeDistrictCode(districtCodeColumn?.value);
    const ownerId = parsePeopleIds(ownerColumn?.value)[0] ?? null;
    if (!districtCode || !ownerId) continue;
    mappings.set(districtCode, ownerId);
  }

  districtOwnerCache.set(cacheKey, {
    expiresAt: Date.now() + ROUTING_CACHE_TTL_MS,
    mappings,
  });
  return mappings;
};

const getContactItemForRouting = async (
  apiKey: string,
  itemId: string,
): Promise<RoutingContactItem | null> => {
  interface Data {
    items?: {
      id?: string | number | null;
      name?: string | null;
      board?: {
        id?: string | number | null;
      } | null;
      column_values?: MondayColumnValue[];
    }[];
  }
  const query = `
    query GetContactItemForRouting($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        name
        board {
          id
        }
        column_values {
          id
          type
          text
          value
          column {
            title
          }
        }
      }
    }
  `;

  const data = await callMondayGraphQL<Data>(apiKey, query, {
    itemIds: [itemId],
  });
  const item = data.items?.[0];
  if (!item?.id) return null;
  const columns = item.column_values ?? [];
  const peopleColumn = findColumnByType(columns, "people");

  const addressLine1Column =
    findColumnById(columns, "text6__1") ??
    findColumnByTitleIncludes(columns, "address") ??
    findColumnByTitleIncludes(columns, "street");
  const addressLine2Column = findColumnById(columns, "text60__1");
  const cityColumn = findColumnById(columns, "text1__1") ?? findColumnByTitleIncludes(columns, "city");
  const stateColumn =
    findColumnById(columns, "text7__1") ?? findColumnByTitleIncludes(columns, "state");
  const zipColumn =
    findColumnById(columns, "text3__1") ??
    findColumnByTitleIncludes(columns, "zip") ??
    findColumnByTitleIncludes(columns, "postal");

  return {
    id: String(item.id),
    name: normalizeValue(item.name) || String(item.id),
    boardId: item.board?.id != null ? String(item.board.id) : null,
    addressLine1: getColumnTextValue(addressLine1Column),
    addressLine2: getColumnTextValue(addressLine2Column),
    city: getColumnTextValue(cityColumn),
    state: getColumnTextValue(stateColumn),
    zip: getColumnTextValue(zipColumn),
    ownerIds: parsePeopleIds(getColumnJsonStringValue(peopleColumn)),
  };
};

const resolveCountyFromAddress = async (address: string) => {
  const normalizedAddress = normalizeValue(address);
  if (!normalizedAddress) {
    return {
      countyName: null,
      countyFips: null,
      matchedAddress: null,
    } satisfies CountyGeocodeResult;
  }
  const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("format", "json");
  url.searchParams.set("address", normalizedAddress);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`US Census geocoder failed with ${response.status}`);
  }

  const json = (await response.json()) as {
    result?: {
      addressMatches?: {
        matchedAddress?: string | null;
        geographies?: {
          Counties?: {
            NAME?: string | null;
            BASENAME?: string | null;
            STATE?: string | null;
            COUNTY?: string | null;
            STATEFP?: string | null;
            COUNTYFP?: string | null;
          }[];
        };
      }[];
    };
  };
  const match = json.result?.addressMatches?.[0];
  const county = match?.geographies?.Counties?.[0];
  const normalizedCountyName =
    normalizeCountyName(county?.BASENAME) ?? normalizeCountyName(county?.NAME);
  const stateCode = normalizeValue(county?.STATEFP ?? county?.STATE);
  const countyCode = normalizeValue(county?.COUNTYFP ?? county?.COUNTY);
  const countyFips = stateCode && countyCode ? `${stateCode}${countyCode}` : null;

  return {
    countyName: normalizedCountyName,
    countyFips,
    matchedAddress: normalizeValue(match?.matchedAddress) || null,
  } satisfies CountyGeocodeResult;
};

const buildAddressQuery = (item: RoutingContactItem) => {
  const parts = [item.addressLine1, item.addressLine2, item.city, item.state, item.zip]
    .map((entry) => normalizeValue(entry))
    .filter((entry) => entry.length > 0);
  if (parts.length === 0) return "";
  return parts.join(", ");
};

const createRoutingResult = (
  input: Omit<MondayDistrictRoutingResult, "districtCode" | "ownerId" | "countyFips" | "countyName" | "matchedAddress"> &
    Partial<Pick<MondayDistrictRoutingResult, "districtCode" | "ownerId" | "countyFips" | "countyName" | "matchedAddress">>,
) => {
  return {
    districtCode: input.districtCode ?? null,
    ownerId: input.ownerId ?? null,
    countyFips: input.countyFips ?? null,
    countyName: input.countyName ?? null,
    matchedAddress: input.matchedAddress ?? null,
    ...input,
  } satisfies MondayDistrictRoutingResult;
};

export const getMondayDistrictRoutingStatus = async (): Promise<MondayDistrictRoutingStatus> => {
  const configResult = getRoutingConfig();
  if (!configResult.ok) {
    return {
      ok: false,
      enabled: false,
      contactBoardId: normalizeValue(env.MONDAY_BOARD_ID) || null,
      countyBoardId: normalizeValue(env.MONDAY_ROUTING_COUNTY_BOARD_ID) || null,
      districtBoardId: normalizeValue(env.MONDAY_ROUTING_DISTRICT_BOARD_ID) || null,
      countyMappingsCount: 0,
      districtOwnerMappingsCount: 0,
      contactBoardUrl: buildBoardUrl(normalizeValue(env.MONDAY_BOARD_ID) || null),
      countyBoardUrl: buildBoardUrl(normalizeValue(env.MONDAY_ROUTING_COUNTY_BOARD_ID) || null),
      districtBoardUrl: buildBoardUrl(normalizeValue(env.MONDAY_ROUTING_DISTRICT_BOARD_ID) || null),
      issues: configResult.issues,
    };
  }

  const { config } = configResult;
  const issues: string[] = [];
  let countyMappingsCount = 0;
  let districtOwnerMappingsCount = 0;
  try {
    const countyMappings = await getCountyDistrictMappings(config);
    countyMappingsCount = countyMappings.size;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed loading county mappings";
    issues.push(`County mapping load failed: ${message}`);
  }
  try {
    const districtMappings = await getDistrictOwnerMappings(config);
    districtOwnerMappingsCount = districtMappings.size;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed loading district owner mappings";
    issues.push(`District ownership load failed: ${message}`);
  }

  return {
    ok: issues.length === 0,
    enabled: true,
    contactBoardId: config.contactBoardId,
    countyBoardId: config.countyBoardId,
    districtBoardId: config.districtBoardId,
    countyMappingsCount,
    districtOwnerMappingsCount,
    contactBoardUrl: buildBoardUrl(config.contactBoardId),
    countyBoardUrl: buildBoardUrl(config.countyBoardId),
    districtBoardUrl: buildBoardUrl(config.districtBoardId),
    issues,
  };
};

export const assignMondayContactOwnerByDistrict = async (args: {
  itemId: string;
  source: "webhook" | "manual";
  force?: boolean;
}) => {
  const itemId = normalizeValue(args.itemId);
  const force = !!args.force;
  if (!itemId) {
    return createRoutingResult({
      ok: false,
      status: "error",
      source: args.source,
      itemId: "",
      message: "Missing itemId",
    });
  }

  const configResult = getRoutingConfig();
  if (!configResult.ok) {
    const message = configResult.issues.join(" | ");
    console.warn("[MondayDistrictRouting] config missing", {
      source: args.source,
      itemId,
      issues: configResult.issues,
    });
    return createRoutingResult({
      ok: false,
      status: "config_missing",
      source: args.source,
      itemId,
      message,
    });
  }

  const { config } = configResult;
  try {
    const contactItem = await getContactItemForRouting(config.apiKey, itemId);
    if (!contactItem) {
      return createRoutingResult({
        ok: false,
        status: "error",
        source: args.source,
        itemId,
        message: "Contact item was not found on Monday",
      });
    }

    if (normalizeValue(contactItem.boardId) !== config.contactBoardId) {
      console.info("[MondayDistrictRouting] skipped board mismatch", {
        source: args.source,
        itemId,
        boardId: contactItem.boardId,
        expectedBoardId: config.contactBoardId,
      });
      return createRoutingResult({
        ok: true,
        status: "skipped_board_mismatch",
        source: args.source,
        itemId,
        message: "Item is not on the configured contact board",
      });
    }

    if (!force && contactItem.ownerIds.length > 0) {
      const existingOwnerId = contactItem.ownerIds[0] ?? null;
      console.info("[MondayDistrictRouting] skipped owner already set", {
        source: args.source,
        itemId,
        ownerId: existingOwnerId,
      });
      return createRoutingResult({
        ok: true,
        status: "skipped_owner_exists",
        source: args.source,
        itemId,
        ownerId: existingOwnerId,
        message: "Owner already assigned",
      });
    }

    const addressQuery = buildAddressQuery(contactItem);
    if (!addressQuery) {
      console.warn("[MondayDistrictRouting] missing address", {
        source: args.source,
        itemId,
      });
      return createRoutingResult({
        ok: false,
        status: "missing_address",
        source: args.source,
        itemId,
        message: "Address/city/state/zip are missing on the contact record",
      });
    }

    const geocode = await resolveCountyFromAddress(addressQuery);
    if (!geocode.countyName) {
      console.warn("[MondayDistrictRouting] county not found", {
        source: args.source,
        itemId,
        addressQuery,
      });
      return createRoutingResult({
        ok: false,
        status: "county_not_found",
        source: args.source,
        itemId,
        matchedAddress: geocode.matchedAddress,
        message: "Unable to resolve county from address",
      });
    }

    const countyMappings = await getCountyDistrictMappings(config);
    const districtCode = countyMappings.get(geocode.countyName) ?? null;
    if (!districtCode) {
      console.warn("[MondayDistrictRouting] district missing for county", {
        source: args.source,
        itemId,
        countyName: geocode.countyName,
      });
      return createRoutingResult({
        ok: false,
        status: "district_not_mapped",
        source: args.source,
        itemId,
        countyName: geocode.countyName,
        countyFips: geocode.countyFips,
        matchedAddress: geocode.matchedAddress,
        message: `No district mapping found for county "${geocode.countyName}"`,
      });
    }

    const districtOwnerMappings = await getDistrictOwnerMappings(config);
    const ownerId = districtOwnerMappings.get(districtCode) ?? null;
    if (!ownerId) {
      console.warn("[MondayDistrictRouting] owner missing for district", {
        source: args.source,
        itemId,
        districtCode,
      });
      return createRoutingResult({
        ok: false,
        status: "owner_not_mapped",
        source: args.source,
        itemId,
        countyName: geocode.countyName,
        countyFips: geocode.countyFips,
        districtCode,
        matchedAddress: geocode.matchedAddress,
        message: `No owner mapping found for district "${districtCode}"`,
      });
    }

    await updateMondayRecordFields({
      itemId,
      ownerId,
    });

    // Non-fatal: upsert a touchpoint record (one per contact-employee-month).
    try {
      await upsertMondayTouchRecord({
        contactItemId: itemId,
        contactName: contactItem.name,
        ownerId,
        source: "routing",
      });
    } catch (touchError) {
      console.warn("[MondayDistrictRouting] touchpoint upsert failed (non-fatal)", {
        itemId,
        ownerId,
        error: touchError instanceof Error ? touchError.message : String(touchError),
      });
    }

    console.info("[MondayDistrictRouting] owner assigned", {
      source: args.source,
      itemId,
      ownerId,
      countyName: geocode.countyName,
      districtCode,
    });
    return createRoutingResult({
      ok: true,
      status: "assigned",
      source: args.source,
      itemId,
      ownerId,
      countyName: geocode.countyName,
      countyFips: geocode.countyFips,
      districtCode,
      matchedAddress: geocode.matchedAddress,
      message: `Assigned owner ${ownerId} via district ${districtCode}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown routing error";
    console.error("[MondayDistrictRouting] routing failed", {
      source: args.source,
      itemId,
      message,
    });
    return createRoutingResult({
      ok: false,
      status: "error",
      source: args.source,
      itemId,
      message,
    });
  }
};
