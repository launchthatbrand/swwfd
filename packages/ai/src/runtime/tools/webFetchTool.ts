import type { RuntimeToolDefinition, RuntimeToolExecutionContext } from "../types";

export type WebFetchToolInput = {
  url: string;
  prompt?: string;
  maxChars?: number;
};

export type WebFetchToolResult = {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  bytes: number;
  contentType?: string;
  rawContent: string;
  normalizedText: string;
  content: string;
  isBinary: boolean;
  truncated: boolean;
  truncationReasons?: Array<"response_bytes" | "raw_chars" | "normalized_chars">;
  redirected: boolean;
  redirectCount: number;
  redirectChain: string[];
  durationMs: number;
  fetchedAt: number;
  cacheStatus: "hit" | "miss";
  binaryArtifact?: WebFetchBinaryArtifactReference;
};

export type WebFetchDomainCheckPhase = "request" | "response" | "redirect";

export type WebFetchDomainCheckDecision = {
  allow: boolean;
  reason?: string;
};

export type WebFetchHostPolicyOptions = {
  allowedHosts?: string[];
  blockedHosts?: string[];
  allowUrlCredentials?: boolean;
  allowLocalhost?: boolean;
  allowPrivateHosts?: boolean;
};

export type WebFetchRedirectPolicyOptions = {
  maxRedirects?: number;
  mode?: "same-host" | "same-registrable-domain";
  allowedRedirectHosts?: string[];
};

export type WebFetchMemoryCacheOptions = {
  enabled?: boolean;
  ttlMs?: number;
  maxEntries?: number;
};

export type WebFetchDomainCheckCacheOptions = {
  enabled?: boolean;
  ttlMs?: number;
  maxEntries?: number;
};

export type WebFetchContentShapingOptions = {
  maxResponseBytes?: number;
  maxRawChars?: number;
  maxNormalizedChars?: number;
};

export type WebFetchBinaryArtifactReference = {
  artifactId: string;
  bytes: number;
  contentType?: string;
  url?: string;
  sha256?: string;
};

export type WebFetchBinaryArtifactInput<TAppContext, TState> = {
  inputUrl: string;
  finalUrl: string;
  fetchedAt: number;
  contentType?: string;
  bytes: Uint8Array;
  context: RuntimeToolExecutionContext<TAppContext, TState>;
};

export type WebFetchBinaryArtifactOptions<TAppContext, TState> = {
  enabled?: boolean;
  maxBytes?: number;
  persist?: (
    payload: WebFetchBinaryArtifactInput<TAppContext, TState>,
  ) => Promise<WebFetchBinaryArtifactReference | undefined> | WebFetchBinaryArtifactReference | undefined;
};

export type CreateWebFetchToolOptions<TAppContext, TState> = {
  timeoutMs?: number;
  maxChars?: number;
  userAgent?: string;
  hostPolicy?: WebFetchHostPolicyOptions;
  redirectPolicy?: WebFetchRedirectPolicyOptions;
  cache?: WebFetchMemoryCacheOptions;
  domainCheckCache?: WebFetchDomainCheckCacheOptions;
  contentShaping?: WebFetchContentShapingOptions;
  binaryArtifacts?: WebFetchBinaryArtifactOptions<TAppContext, TState>;
  checkDomainPolicy?: (args: {
    phase: WebFetchDomainCheckPhase;
    url: string;
    hostname: string;
    context: RuntimeToolExecutionContext<TAppContext, TState>;
  }) => Promise<WebFetchDomainCheckDecision | void> | WebFetchDomainCheckDecision | void;
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_CHARS = 120_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2_500_000;
const DEFAULT_MAX_REDIRECTS = 4;
const DEFAULT_CACHE_TTL_MS = 30_000;
const DEFAULT_CACHE_MAX_ENTRIES = 48;
const DEFAULT_DOMAIN_CACHE_TTL_MS = 60_000;
const DEFAULT_DOMAIN_CACHE_MAX_ENTRIES = 256;
const DEFAULT_BINARY_MAX_BYTES = 5_000_000;

type MemoryCacheEntry<TValue> = {
  value: TValue;
  expiresAt: number;
};

const hostMatchesRule = (hostname: string, rule: string): boolean => {
  const normalizedHost = hostname.toLowerCase();
  const normalizedRule = rule.trim().toLowerCase();
  if (!normalizedRule) return false;
  if (normalizedRule.startsWith("*.")) {
    const base = normalizedRule.slice(2);
    return normalizedHost === base || normalizedHost.endsWith(`.${base}`);
  }
  return normalizedHost === normalizedRule || normalizedHost.endsWith(`.${normalizedRule}`);
};

const clampPositiveInt = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value ?? fallback);
  return rounded > 0 ? rounded : fallback;
};

const normalizeHost = (hostname: string): string => hostname.trim().toLowerCase().replace(/\.$/, "");

const normalizeComparableHost = (hostname: string): string => normalizeHost(hostname).replace(/^www\./, "");

const extractRegistrableDomain = (hostname: string): string => {
  const comparable = normalizeComparableHost(hostname);
  const labels = comparable.split(".").filter(Boolean);
  if (labels.length <= 2) return comparable;
  return labels.slice(-2).join(".");
};

const isPrivateIpv4Address = (hostname: string): boolean => {
  const octets = hostname.split(".");
  if (octets.length !== 4) return false;
  const values = octets.map((part) => Number(part));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [first, second] = values;
  if (first === 10 || first === 127) return true;
  if (first === 192 && second === 168) return true;
  if (first === 172 && typeof second === "number" && second >= 16 && second <= 31) return true;
  if (first === 169 && second === 254) return true;
  return false;
};

const isPrivateIpv6Address = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
};

const isLocalhostHost = (hostname: string): boolean => {
  const normalized = normalizeHost(hostname);
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
};

const isPrivateHost = (hostname: string): boolean =>
  isPrivateIpv4Address(hostname) || isPrivateIpv6Address(hostname);

const isLikelyTextContentType = (contentType: string | null): boolean => {
  if (!contentType) return true;
  const normalized = contentType.toLowerCase();
  if (normalized.startsWith("text/")) return true;
  return (
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("javascript") ||
    normalized.includes("xhtml") ||
    normalized.includes("csv") ||
    normalized.includes("svg")
  );
};

const readCache = <TValue>(
  cache: Map<string, MemoryCacheEntry<TValue>>,
  key: string,
): TValue | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
};

const writeCache = <TValue>(
  cache: Map<string, MemoryCacheEntry<TValue>>,
  key: string,
  value: TValue,
  ttlMs: number,
  maxEntries: number,
): void => {
  cache.delete(key);
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
};

const validateInputUrl = (url: string, hostPolicy: WebFetchHostPolicyOptions): URL => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }
  if (!hostPolicy.allowUrlCredentials && (parsed.username || parsed.password)) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }
  if (!parsed.hostname || parsed.hostname.length > 253) {
    throw new Error("URL host is invalid.");
  }
  if (!hostPolicy.allowLocalhost && isLocalhostHost(parsed.hostname)) {
    throw new Error("Localhost URLs are blocked by policy.");
  }
  if (!hostPolicy.allowPrivateHosts && isPrivateHost(parsed.hostname)) {
    throw new Error("Private network URLs are blocked by policy.");
  }
  return parsed;
};

const assertRedirectAllowed = (
  fromUrl: string,
  toUrl: string,
  redirectPolicy: WebFetchRedirectPolicyOptions,
): void => {
  const fromHost = normalizeHost(new URL(fromUrl).hostname);
  const toHost = normalizeHost(new URL(toUrl).hostname);
  const explicitAllow = (redirectPolicy.allowedRedirectHosts ?? []).some((rule) =>
    hostMatchesRule(toHost, rule),
  );
  if (explicitAllow) return;
  const mode = redirectPolicy.mode ?? "same-host";
  if (mode === "same-host") {
    if (normalizeComparableHost(fromHost) !== normalizeComparableHost(toHost)) {
      throw new Error(`Redirect blocked: host transition from "${fromHost}" to "${toHost}" is not allowed.`);
    }
    return;
  }
  if (extractRegistrableDomain(fromHost) !== extractRegistrableDomain(toHost)) {
    throw new Error(
      `Redirect blocked: registrable domain transition from "${fromHost}" to "${toHost}" is not allowed.`,
    );
  }
};

const readResponseBytes = async (
  response: Response,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncatedByResponseBytes: boolean }> => {
  if (!response.body) {
    return { bytes: new Uint8Array(0), truncatedByResponseBytes: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncatedByResponseBytes = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    const nextTotal = totalBytes + value.length;
    if (nextTotal > maxBytes) {
      const allowedBytes = Math.max(0, maxBytes - totalBytes);
      if (allowedBytes > 0) {
        chunks.push(value.slice(0, allowedBytes));
        totalBytes += allowedBytes;
      }
      truncatedByResponseBytes = true;
      try {
        await reader.cancel("response_byte_limit_reached");
      } catch {
        // no-op: cancellation can fail on already-closed streams.
      }
      break;
    }
    chunks.push(value);
    totalBytes = nextTotal;
  }
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes: merged, truncatedByResponseBytes };
};

const assertHostPolicy = async <TAppContext, TState>(args: {
  url: string;
  options: CreateWebFetchToolOptions<TAppContext, TState>;
  phase: WebFetchDomainCheckPhase;
  context: RuntimeToolExecutionContext<TAppContext, TState>;
  domainDecisionCache: Map<string, MemoryCacheEntry<WebFetchDomainCheckDecision>>;
  cacheTtlMs: number;
  cacheMaxEntries: number;
}) => {
  const parsed = validateInputUrl(args.url, args.options.hostPolicy ?? {});
  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = args.options.hostPolicy?.blockedHosts ?? [];
  const allowedHosts = args.options.hostPolicy?.allowedHosts ?? [];
  if (blockedHosts.some((rule) => hostMatchesRule(hostname, rule))) {
    throw new Error(`WebFetch ${args.phase} host "${hostname}" is blocked by policy.`);
  }
  if (allowedHosts.length > 0) {
    const allowed = allowedHosts.some((rule) => hostMatchesRule(hostname, rule));
    if (!allowed) {
      throw new Error(`WebFetch ${args.phase} host "${hostname}" is not in allowed hosts policy.`);
    }
  }
  if (!args.options.checkDomainPolicy) {
    return;
  }
  const cacheEnabled = args.options.domainCheckCache?.enabled ?? true;
  const cacheKey = `${args.phase}|${hostname}`;
  if (cacheEnabled) {
    const cachedDecision = readCache(args.domainDecisionCache, cacheKey);
    if (cachedDecision) {
      if (!cachedDecision.allow) {
        throw new Error(
          cachedDecision.reason ??
            `WebFetch ${args.phase} host "${hostname}" was blocked by domain policy.`,
        );
      }
      return;
    }
  }
  const decision =
    (await args.options.checkDomainPolicy({
      phase: args.phase,
      url: parsed.toString(),
      hostname,
      context: args.context,
    })) ?? { allow: true };
  if (cacheEnabled) {
    writeCache(
      args.domainDecisionCache,
      cacheKey,
      decision,
      args.cacheTtlMs,
      args.cacheMaxEntries,
    );
  }
  if (!decision.allow) {
    throw new Error(
      decision.reason ?? `WebFetch ${args.phase} host "${hostname}" was blocked by domain policy.`,
    );
  }
};

const cloneFetchResult = (result: WebFetchToolResult): WebFetchToolResult => {
  return {
    ...result,
    redirectChain: [...result.redirectChain],
    truncationReasons: result.truncationReasons ? [...result.truncationReasons] : undefined,
    binaryArtifact: result.binaryArtifact ? { ...result.binaryArtifact } : undefined,
  };
};

const normalizeRequestedUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
};

const buildCacheKey = (url: string, maxChars: number): string => {
  return `${normalizeRequestedUrl(url)}|maxChars=${maxChars}`;
};

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /aborted|aborterror|timeout/i.test(message);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const maybePersistBinaryArtifact = async <TAppContext, TState>(args: {
  options: CreateWebFetchToolOptions<TAppContext, TState>;
  inputUrl: string;
  finalUrl: string;
  fetchedAt: number;
  contentType: string | undefined;
  bytes: Uint8Array;
  context: RuntimeToolExecutionContext<TAppContext, TState>;
}): Promise<WebFetchBinaryArtifactReference | undefined> => {
  if (!args.options.binaryArtifacts?.enabled) return undefined;
  const maxBinaryBytes = clampPositiveInt(
    args.options.binaryArtifacts.maxBytes,
    DEFAULT_BINARY_MAX_BYTES,
  );
  if (args.bytes.length > maxBinaryBytes) {
    return {
      artifactId: "binary_oversize",
      bytes: args.bytes.length,
      contentType: args.contentType,
    };
  }
  const persistFn = args.options.binaryArtifacts.persist;
  if (!persistFn) {
    return {
      artifactId: "binary_not_persisted",
      bytes: args.bytes.length,
      contentType: args.contentType,
    };
  }
  try {
    return await persistFn({
      inputUrl: args.inputUrl,
      finalUrl: args.finalUrl,
      fetchedAt: args.fetchedAt,
      contentType: args.contentType,
      bytes: args.bytes,
      context: args.context,
    });
  } catch (error) {
    throw new Error(`Binary artifact persistence failed: ${toErrorMessage(error)}`);
  }
};

const truncateTextByChars = (
  value: string,
  maxChars: number,
  reason: "raw_chars" | "normalized_chars",
  reasons: Set<"response_bytes" | "raw_chars" | "normalized_chars">,
): string => {
  if (value.length <= maxChars) return value;
  reasons.add(reason);
  return value.slice(0, maxChars);
};

const readFetchContent = async <TAppContext, TState>(args: {
  response: Response;
  options: CreateWebFetchToolOptions<TAppContext, TState>;
  inputMaxChars: number;
  inputUrl: string;
  finalUrl: string;
  startedAt: number;
  context: RuntimeToolExecutionContext<TAppContext, TState>;
  redirected: boolean;
  redirectChain: string[];
}): Promise<WebFetchToolResult> => {
  const maxResponseBytes = clampPositiveInt(
    args.options.contentShaping?.maxResponseBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
  );
  const maxRawChars = clampPositiveInt(
    args.options.contentShaping?.maxRawChars,
    args.inputMaxChars,
  );
  const maxNormalizedChars = clampPositiveInt(
    args.options.contentShaping?.maxNormalizedChars,
    args.inputMaxChars,
  );
  const contentType = args.response.headers.get("content-type") ?? undefined;
  const isBinary = !isLikelyTextContentType(contentType ?? null);
  const truncationReasons = new Set<"response_bytes" | "raw_chars" | "normalized_chars">();
  const { bytes, truncatedByResponseBytes } = await readResponseBytes(args.response, maxResponseBytes);
  if (truncatedByResponseBytes) {
    truncationReasons.add("response_bytes");
  }
  const decoder = new TextDecoder();
  const decodedText = decoder.decode(bytes);
  const boundedRawContent = truncateTextByChars(
    decodedText,
    maxRawChars,
    "raw_chars",
    truncationReasons,
  );
  const normalizedText = isBinary
    ? ""
    : truncateTextByChars(
        normalizeFetchedText(boundedRawContent, contentType ?? null),
        maxNormalizedChars,
        "normalized_chars",
        truncationReasons,
      );
  const binaryArtifact = isBinary
    ? await maybePersistBinaryArtifact({
        options: args.options,
        inputUrl: args.inputUrl,
        finalUrl: args.finalUrl,
        fetchedAt: Date.now(),
        contentType,
        bytes,
        context: args.context,
      })
    : undefined;
  const truncated = truncationReasons.size > 0;
  return {
    url: args.inputUrl,
    finalUrl: args.finalUrl,
    status: args.response.status,
    statusText: args.response.statusText,
    bytes: bytes.length,
    contentType,
    rawContent: boundedRawContent,
    normalizedText,
    content: normalizedText,
    isBinary,
    truncated,
    truncationReasons: truncated ? [...truncationReasons] : undefined,
    redirected: args.redirected,
    redirectCount: args.redirectChain.length,
    redirectChain: [...args.redirectChain],
    durationMs: Date.now() - args.startedAt,
    fetchedAt: Date.now(),
    cacheStatus: "miss",
    binaryArtifact,
  };
};

const fetchWithRedirectPolicy = async <TAppContext, TState>(args: {
  inputUrl: string;
  options: CreateWebFetchToolOptions<TAppContext, TState>;
  headers: HeadersInit | undefined;
  abortSignal: AbortSignal;
  context: RuntimeToolExecutionContext<TAppContext, TState>;
  domainDecisionCache: Map<string, MemoryCacheEntry<WebFetchDomainCheckDecision>>;
  domainCacheTtlMs: number;
  domainCacheMaxEntries: number;
}): Promise<{ response: Response; finalUrl: string; redirectChain: string[]; redirected: boolean }> => {
  const maxRedirects = clampPositiveInt(args.options.redirectPolicy?.maxRedirects, DEFAULT_MAX_REDIRECTS);
  const redirectChain: string[] = [];
  let currentUrl = args.inputUrl;
  let redirected = false;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertHostPolicy({
      url: currentUrl,
      options: args.options,
      phase: hop === 0 ? "request" : "redirect",
      context: args.context,
      domainDecisionCache: args.domainDecisionCache,
      cacheTtlMs: args.domainCacheTtlMs,
      cacheMaxEntries: args.domainCacheMaxEntries,
    });
    const response = await fetch(currentUrl, {
      method: "GET",
      headers: args.headers,
      signal: args.abortSignal,
      redirect: "manual",
    });
    const status = response.status;
    if (status < 300 || status >= 400) {
      const finalUrl =
        typeof response.url === "string" && response.url.length > 0 ? response.url : currentUrl;
      await assertHostPolicy({
        url: finalUrl,
        options: args.options,
        phase: "response",
        context: args.context,
        domainDecisionCache: args.domainDecisionCache,
        cacheTtlMs: args.domainCacheTtlMs,
        cacheMaxEntries: args.domainCacheMaxEntries,
      });
      return {
        response,
        finalUrl,
        redirectChain,
        redirected,
      };
    }
    const location = response.headers.get("location");
    if (!location) {
      return {
        response,
        finalUrl: currentUrl,
        redirectChain,
        redirected,
      };
    }
    if (hop >= maxRedirects) {
      throw new Error(`Redirect limit exceeded (${maxRedirects}).`);
    }
    const nextUrl = new URL(location, currentUrl).toString();
    assertRedirectAllowed(currentUrl, nextUrl, args.options.redirectPolicy ?? {});
    redirectChain.push(nextUrl);
    currentUrl = nextUrl;
    redirected = true;
  }
  throw new Error("Redirect handling failed.");
};

const wrapFetchFailure = (error: unknown): Error => {
  const message = toErrorMessage(error);
  if (isAbortError(error)) {
    if (/timeout/i.test(message)) {
      return new Error(`WebFetch request timed out: ${message}`);
    }
  }
  return new Error(`WebFetch request failed: ${message}`);
};

const stripHtml = (value: string): string => {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|br|tr|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const normalizeFetchedText = (rawContent: string, contentType: string | null): string => {
  const shouldTreatAsHtml =
    (contentType?.toLowerCase().includes("text/html") ?? false) ||
    /<html|<body|<!doctype html/i.test(rawContent);
  if (shouldTreatAsHtml) {
    return stripHtml(rawContent);
  }
  return rawContent.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
};

export const createWebFetchTool = <TAppContext, TState>(
  options: CreateWebFetchToolOptions<TAppContext, TState> = {},
): RuntimeToolDefinition<TAppContext, TState, WebFetchToolInput, WebFetchToolResult> => {
  const urlResultCache = new Map<string, MemoryCacheEntry<WebFetchToolResult>>();
  const domainDecisionCache = new Map<string, MemoryCacheEntry<WebFetchDomainCheckDecision>>();
  return {
    name: "webFetch",
    description: "Fetch URL content for analysis.",
    isConcurrencySafe: () => true,
    isReadOnly: () => true,
    validateInput: async (input) => {
      try {
        validateInputUrl(input.url, options.hostPolicy ?? {});
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message: toErrorMessage(error),
        };
      }
    },
    execute: async (input, context) => {
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const maxChars = Math.max(1_000, input.maxChars ?? options.maxChars ?? DEFAULT_MAX_CHARS);
      const cacheEnabled = options.cache?.enabled ?? true;
      const cacheTtlMs = clampPositiveInt(options.cache?.ttlMs, DEFAULT_CACHE_TTL_MS);
      const cacheMaxEntries = clampPositiveInt(options.cache?.maxEntries, DEFAULT_CACHE_MAX_ENTRIES);
      const domainCacheTtlMs = clampPositiveInt(
        options.domainCheckCache?.ttlMs,
        DEFAULT_DOMAIN_CACHE_TTL_MS,
      );
      const domainCacheMaxEntries = clampPositiveInt(
        options.domainCheckCache?.maxEntries,
        DEFAULT_DOMAIN_CACHE_MAX_ENTRIES,
      );
      const startedAt = Date.now();
      context.emitProgress({
        message: `Fetching ${input.url}`,
      });
      const cacheKey = buildCacheKey(input.url, maxChars);
      if (cacheEnabled) {
        const cached = readCache(urlResultCache, cacheKey);
        if (cached) {
          const fromCache = cloneFetchResult(cached);
          fromCache.cacheStatus = "hit";
          context.emitProgress({
            message: `Fetched ${input.url} from cache (${fromCache.status})`,
          });
          return {
            data: fromCache,
            metadata: {
              status: fromCache.status,
              truncated: fromCache.truncated,
              redirected: fromCache.redirected,
              finalUrl: fromCache.finalUrl,
              cacheStatus: fromCache.cacheStatus,
              redirectCount: fromCache.redirectCount,
              isBinary: fromCache.isBinary,
            },
          };
        }
      }

      const abortController = new AbortController();
      const onAbort = () => abortController.abort(context.signal.reason);
      context.signal.addEventListener("abort", onAbort, { once: true });
      const timeout = setTimeout(() => abortController.abort("timeout"), timeoutMs);

      try {
        const { response, finalUrl, redirectChain, redirected } = await fetchWithRedirectPolicy({
          inputUrl: input.url,
          options,
          headers: options.userAgent
            ? ({
                "User-Agent": options.userAgent,
              } as HeadersInit)
            : undefined,
          abortSignal: abortController.signal,
          context,
          domainDecisionCache,
          domainCacheTtlMs,
          domainCacheMaxEntries,
        });
        const result = await readFetchContent({
          response,
          options,
          inputMaxChars: maxChars,
          inputUrl: input.url,
          finalUrl,
          startedAt,
          context,
          redirected,
          redirectChain,
        });
        if (cacheEnabled) {
          writeCache(urlResultCache, cacheKey, cloneFetchResult(result), cacheTtlMs, cacheMaxEntries);
        }
        context.emitProgress({
          message: `Fetched ${input.url} (${result.status})`,
        });
        return {
          data: result,
          metadata: {
            status: result.status,
            truncated: result.truncated,
            redirected: result.redirected,
            finalUrl: result.finalUrl,
            cacheStatus: result.cacheStatus,
            redirectCount: result.redirectCount,
            isBinary: result.isBinary,
            truncationReasons: result.truncationReasons,
            contentType: result.contentType,
            binaryArtifact: result.binaryArtifact,
          },
        };
      } catch (error) {
        throw wrapFetchFailure(error);
      } finally {
        clearTimeout(timeout);
        context.signal.removeEventListener("abort", onAbort);
      }
    },
  };
};

