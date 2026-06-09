export type CrawlUrlStatus = "detected" | "processing" | "completed" | "failed";

export type CrawlSourceType = string;

export const CRAWL_ASSET_PATH_PATTERN =
  /\.(png|jpg|jpeg|gif|svg|webp|ico|map|css|js|json|xml|txt|pdf|zip|gz|tgz|rar|7z|woff|woff2|ttf|eot|mp4|mp3|wav|mov|avi|webm)(?:$|[?#])/i;

export type NormalizeUrlForCrawlIdentityOptions = {
  stripHash?: boolean;
  stripSearch?: boolean;
  trimTrailingSlash?: boolean;
  lowercaseHostname?: boolean;
};

export type DiscoverFirstLevelNestedUrlsOptions = {
  maxUrls?: number;
  sameHostOnly?: boolean;
  prioritizeHeaderFooter?: boolean;
  includePageLevelAnchors?: boolean;
  includeAssetPaths?: boolean;
  allowPathname?: (pathname: string, resolvedUrl: URL) => boolean;
  denyPathname?: (pathname: string, resolvedUrl: URL) => boolean;
  normalizeIdentity?: (rawUrl: string) => string | null;
};

const normalizeHostForCrawl = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/^www\./, "");

export const normalizeUrlForCrawlIdentity = (
  rawUrl: string,
  options: NormalizeUrlForCrawlIdentityOptions = {},
): string | null => {
  try {
    const parsed = new URL(rawUrl);
    if (options.stripHash ?? true) {
      parsed.hash = "";
    }
    if (options.stripSearch ?? true) {
      parsed.search = "";
    }
    if (options.lowercaseHostname ?? true) {
      parsed.hostname = parsed.hostname.toLowerCase();
    }
    if ((options.trimTrailingSlash ?? true) && parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export const extractAnchorHrefs = (rawHtml: string): string[] =>
  Array.from(rawHtml.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>/gi))
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);

type ResolveFirstLevelCrawlUrlArgs = {
  href: string;
  rootUrl: string;
  normalizedRootHost: string;
  options?: DiscoverFirstLevelNestedUrlsOptions;
};

export const resolveFirstLevelCrawlUrl = (
  args: ResolveFirstLevelCrawlUrlArgs,
): string | null => {
  const href = args.href.trim();
  if (!href) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;
  try {
    const resolved = new URL(href, args.rootUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    if (
      (args.options?.sameHostOnly ?? true) &&
      normalizeHostForCrawl(resolved.hostname) !== args.normalizedRootHost
    ) {
      return null;
    }
    if (!args.options?.includeAssetPaths) {
      if (resolved.pathname.startsWith("/_next/") || CRAWL_ASSET_PATH_PATTERN.test(resolved.pathname)) {
        return null;
      }
    }
    if (args.options?.denyPathname && args.options.denyPathname(resolved.pathname, resolved)) {
      return null;
    }
    if (args.options?.allowPathname && !args.options.allowPathname(resolved.pathname, resolved)) {
      return null;
    }
    resolved.hash = "";
    resolved.search = "";
    if (resolved.pathname !== "/" && resolved.pathname.endsWith("/")) {
      resolved.pathname = resolved.pathname.slice(0, -1);
    }
    return resolved.toString();
  } catch {
    return null;
  }
};

const extractHeaderFooterSections = (rawHtml: string): string[] =>
  Array.from(rawHtml.matchAll(/<(header|footer)\b[\s\S]*?<\/\1>/gi)).map(
    (match) => match[0] ?? "",
  );

export const discoverFirstLevelNestedUrls = (args: {
  rawHtml: string;
  rootUrl: string;
  options?: DiscoverFirstLevelNestedUrlsOptions;
}): string[] => {
  if (!args.rawHtml.trim()) return [];
  let rootParsed: URL;
  try {
    rootParsed = new URL(args.rootUrl);
  } catch {
    return [];
  }

  const options = args.options ?? {};
  const normalizeIdentity = options.normalizeIdentity ?? normalizeUrlForCrawlIdentity;
  const normalizedRootHost = normalizeHostForCrawl(rootParsed.hostname);
  const rootIdentity = normalizeIdentity(args.rootUrl);
  if (!rootIdentity) return [];

  const prioritizedHrefs = (options.prioritizeHeaderFooter ?? true)
    ? extractHeaderFooterSections(args.rawHtml).flatMap((section) => extractAnchorHrefs(section))
    : [];
  const pageLevelHrefs = options.includePageLevelAnchors ?? true ? extractAnchorHrefs(args.rawHtml) : [];
  const orderedHrefs = [...prioritizedHrefs, ...pageLevelHrefs];

  const discovered: string[] = [];
  const seenIdentities = new Set<string>();
  for (const href of orderedHrefs) {
    const resolved = resolveFirstLevelCrawlUrl({
      href,
      rootUrl: args.rootUrl,
      normalizedRootHost,
      options,
    });
    if (!resolved) continue;
    const identity = normalizeIdentity(resolved);
    if (!identity || identity === rootIdentity || seenIdentities.has(identity)) {
      continue;
    }
    seenIdentities.add(identity);
    discovered.push(resolved);
    if (typeof options.maxUrls === "number" && options.maxUrls > 0 && discovered.length >= options.maxUrls) {
      break;
    }
  }
  return discovered;
};

