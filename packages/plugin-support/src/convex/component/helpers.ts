import type { QueryCtx } from "./_generated/server";
import {
  defaultSupportChatSettings,
  supportAutoRespondToThreadsKey,
  supportContactCaptureFieldsKey,
  supportContactCaptureKey,
  supportIntroHeadlineKey,
  supportLoggedInUsersAutocaptureKey,
  supportPrivacyMessageKey,
  supportWelcomeMessageKey,
  supportWidgetAllowedOriginsOptionKey,
  supportWidgetKeyOptionKey,
  type SupportChatSettings,
} from "../../settings";

export const organizationMatches = (
  recordOrg: string | undefined,
  requestedOrg?: string,
) => {
  const normalizedRequested = requestedOrg ?? undefined;
  return (recordOrg ?? undefined) === normalizedRequested;
};

// Legacy helper no longer used now that support email settings live in options.
// Kept as a stub to avoid import breakage.
export async function getEmailSettingsByAliasHelper(
  _ctx: QueryCtx,
  _aliasLocalPart: string,
): Promise<null> {
  return null;
}

const DEFAULT_EMAIL_DOMAIN =
  process.env.SUPPORT_EMAIL_DOMAIN ?? "support.launchthat.dev";

const sanitizeOrganizationId = (organizationId: string) =>
  organizationId.replace(/[^a-z0-9]/gi, "").toLowerCase();

const randomSuffix = (length: number) => {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36)
      .toString(36)
      .charAt(0),
  ).join("");
};

export const generateDefaultAliasParts = (organizationId: string) => {
  const base = sanitizeOrganizationId(organizationId);
  const suffix = randomSuffix(8);
  const localPart = `${base}${suffix}`;
  const address = `${localPart}@${DEFAULT_EMAIL_DOMAIN}`;
  return { localPart, address };
};

const parseStringArrayJson = (value: unknown): string[] => {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
};

const parseBooleanOption = (
  value: unknown,
  fallback: boolean,
): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
};

const parseStringOption = (
  value: unknown,
  fallback: string,
): string => {
  return typeof value === "string" ? value : fallback;
};

const parseFieldsOption = (
  value: unknown,
  fallback: SupportChatSettings["fields"],
): SupportChatSettings["fields"] => {
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const flags = { ...fallback };
    for (const key of Object.keys(flags)) {
      flags[key as keyof typeof flags] = parsed.includes(key);
    }
    return flags;
  } catch {
    return fallback;
  }
};

const normalizeRequestHost = (host?: string): string | null => {
  if (!host) return null;
  const normalized = host.split(",")[0]?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
};

const isSameHostAsRequest = (
  origin: string,
  requestHost?: string,
): boolean => {
  const host = normalizeRequestHost(requestHost);
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
};

const hasAllowedOriginHost = (origin: string, allowedOrigins: string[]): boolean => {
  try {
    const normalizedOriginHost = new URL(origin).host.toLowerCase();
    return allowedOrigins.some((allowedOrigin) => {
      try {
        return new URL(allowedOrigin).host.toLowerCase() === normalizedOriginHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

export const listSupportOptionsMap = async (
  ctx: QueryCtx | any,
  organizationId: string,
): Promise<Map<string, unknown>> => {
  const options = (await ctx.db
    .query("options")
    .withIndex("by_org_key", (q: any) => q.eq("organizationId", organizationId))
    .collect()) as Array<{ key: string; value?: unknown }>;
  const map = new Map<string, unknown>();
  for (const option of options) {
    map.set(option.key, option.value ?? null);
  }
  return map;
};

export const assertWidgetAccess = async (
  ctx: QueryCtx | any,
  args: {
    organizationId: string;
    widgetKey: string;
    requestOrigin?: string;
    requestHost?: string;
  },
): Promise<{ allowedOrigins: string[] }> => {
  if (!args.organizationId?.trim()) {
    throw new Error("organizationId is required");
  }
  if (!args.widgetKey?.trim()) {
    throw new Error("widgetKey is required");
  }

  const options = await listSupportOptionsMap(ctx, args.organizationId);
  const expectedWidgetKey = options.get(supportWidgetKeyOptionKey);
  const expectedWidgetKeyString =
    typeof expectedWidgetKey === "string" ? expectedWidgetKey : "";
  if (!expectedWidgetKeyString) {
    throw new Error("support widget is not configured");
  }
  if (expectedWidgetKeyString !== args.widgetKey) {
    throw new Error("invalid widgetKey");
  }

  const allowedOrigins = parseStringArrayJson(
    options.get(supportWidgetAllowedOriginsOptionKey),
  );
  if (allowedOrigins.length > 0) {
    const normalizedOrigin =
      typeof args.requestOrigin === "string" ? args.requestOrigin.trim() : "";
    if (normalizedOrigin) {
      if (
        !allowedOrigins.includes(normalizedOrigin) &&
        !isSameHostAsRequest(normalizedOrigin, args.requestHost)
      ) {
        throw new Error("Origin not allowed");
      }
    } else {
      const normalizedHost = normalizeRequestHost(args.requestHost);
      if (!normalizedHost) {
        // Convex widget transport calls can race before client metadata is available.
        // Keep widget key auth as the hard gate and defer origin enforcement.
        return { allowedOrigins };
      }
      const hostAllowed = hasAllowedOriginHost(
        `https://${normalizedHost}`,
        allowedOrigins,
      );
      if (!hostAllowed) {
        throw new Error("Origin not allowed");
      }
    }
  }

  return { allowedOrigins };
};

export const getWidgetChatSettings = (
  options: Map<string, unknown>,
): SupportChatSettings => {
  return {
    ...defaultSupportChatSettings,
    requireContact: parseBooleanOption(
      options.get(supportContactCaptureKey),
      defaultSupportChatSettings.requireContact,
    ),
    loggedInUsersAutocapture: parseBooleanOption(
      options.get(supportLoggedInUsersAutocaptureKey),
      defaultSupportChatSettings.loggedInUsersAutocapture,
    ),
    fields: parseFieldsOption(
      options.get(supportContactCaptureFieldsKey),
      defaultSupportChatSettings.fields,
    ),
    introHeadline: parseStringOption(
      options.get(supportIntroHeadlineKey),
      defaultSupportChatSettings.introHeadline,
    ),
    welcomeMessage: parseStringOption(
      options.get(supportWelcomeMessageKey),
      defaultSupportChatSettings.welcomeMessage,
    ),
    privacyMessage: parseStringOption(
      options.get(supportPrivacyMessageKey),
      defaultSupportChatSettings.privacyMessage,
    ),
    autoRespondToThreads: parseBooleanOption(
      options.get(supportAutoRespondToThreadsKey),
      defaultSupportChatSettings.autoRespondToThreads,
    ),
  };
};
