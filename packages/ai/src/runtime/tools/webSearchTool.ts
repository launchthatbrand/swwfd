import type { RuntimeToolDefinition } from "../types";

export type WebSearchToolInput = {
  query: string;
  limit?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
};

export type WebSearchHit = {
  title: string;
  url: string;
  snippet?: string;
};

export type WebSearchToolResult = {
  query: string;
  limit: number;
  results: WebSearchHit[];
  durationMs: number;
};

export type CreateWebSearchToolOptions<TAppContext, TState> = {
  search: (
    input: WebSearchToolInput,
    context: {
      appContext: TAppContext;
      state: TState;
      signal: AbortSignal;
    },
  ) => Promise<WebSearchHit[]>;
  defaultLimit?: number;
  maxLimit?: number;
  defaultAllowedDomains?: string[];
  defaultBlockedDomains?: string[];
};

const normalizeDomainRule = (value: string): string => value.trim().toLowerCase();

const domainMatchesRule = (hostname: string, rule: string): boolean => {
  const normalizedHost = hostname.toLowerCase();
  const normalizedRule = normalizeDomainRule(rule);
  if (!normalizedRule) return false;
  if (normalizedRule.startsWith("*.")) {
    const base = normalizedRule.slice(2);
    return normalizedHost === base || normalizedHost.endsWith(`.${base}`);
  }
  return normalizedHost === normalizedRule || normalizedHost.endsWith(`.${normalizedRule}`);
};

const getHostname = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeSnippet = (snippet: string | undefined): string | undefined => {
  if (typeof snippet !== "string") return undefined;
  const normalized = snippet.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeHit = (hit: WebSearchHit): WebSearchHit | null => {
  if (!hit?.url || typeof hit.url !== "string") return null;
  const trimmedUrl = hit.url.trim();
  if (!trimmedUrl) return null;
  return {
    title: (hit.title ?? "").replace(/\s+/g, " ").trim(),
    url: trimmedUrl,
    snippet: normalizeSnippet(hit.snippet),
  };
};

export const createWebSearchTool = <TAppContext, TState>(
  options: CreateWebSearchToolOptions<TAppContext, TState>,
): RuntimeToolDefinition<TAppContext, TState, WebSearchToolInput, WebSearchToolResult> => ({
  name: "webSearch",
  description: "Search the web and return relevant results.",
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  validateInput: async (input) => {
    const query = input.query?.trim();
    if (!query || query.length < 2) {
      return {
        ok: false,
        message: "Search query must include at least 2 characters.",
      };
    }
    const allowed = input.allowedDomains ?? options.defaultAllowedDomains ?? [];
    const blocked = input.blockedDomains ?? options.defaultBlockedDomains ?? [];
    const overlap = allowed.some((allowedRule) =>
      blocked.some((blockedRule) => normalizeDomainRule(allowedRule) === normalizeDomainRule(blockedRule)),
    );
    if (overlap) {
      return {
        ok: false,
        message: "allowedDomains and blockedDomains cannot contain the same domain.",
      };
    }
    return { ok: true };
  },
  execute: async (input, context) => {
    const startedAt = Date.now();
    const limit = Math.max(1, Math.min(input.limit ?? options.defaultLimit ?? 5, options.maxLimit ?? 10));
    context.emitProgress({
      message: `Searching web for "${input.query}"`,
    });

    const results = await options.search(
      {
        ...input,
        limit,
      },
      {
        appContext: context.appContext,
        state: context.state,
        signal: context.signal,
      },
    );

    const allowedDomains = input.allowedDomains ?? options.defaultAllowedDomains ?? [];
    const blockedDomains = input.blockedDomains ?? options.defaultBlockedDomains ?? [];
    const filteredResults: WebSearchHit[] = [];
    const seenUrls = new Set<string>();
    const normalizedHits = Array.isArray(results)
      ? results.map(normalizeHit).filter((hit): hit is WebSearchHit => hit !== null)
      : [];

    for (const hit of normalizedHits) {
      if (seenUrls.has(hit.url)) {
        continue;
      }
      const hostname = getHostname(hit.url);
      if (!hostname) {
        continue;
      }
      if (blockedDomains.some((rule) => domainMatchesRule(hostname, rule))) {
        continue;
      }
      if (
        allowedDomains.length > 0 &&
        !allowedDomains.some((rule) => domainMatchesRule(hostname, rule))
      ) {
        continue;
      }
      seenUrls.add(hit.url);
      filteredResults.push(hit);
      if (filteredResults.length >= limit) {
        break;
      }
    }

    const payload: WebSearchToolResult = {
      query: input.query,
      limit,
      results: filteredResults,
      durationMs: Date.now() - startedAt,
    };
    context.emitProgress({
      message: `Search completed for "${input.query}" (${payload.results.length} results)`,
    });
    return {
      data: payload,
      metadata: {
        resultCount: payload.results.length,
        allowedDomains,
        blockedDomains,
      },
    };
  },
});

