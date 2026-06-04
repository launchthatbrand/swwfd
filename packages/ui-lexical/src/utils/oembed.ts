export interface OEmbedPayload {
  url: string;
  html: string;
  providerName?: string;
  title?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  videoId?: string;
}

interface RawOEmbedResponse {
  html?: string;
  provider_name?: string;
  title?: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
}

interface OEmbedProvider {
  name: string;
  displayName: string;
  matcher: RegExp;
  endpoint: string;
}

const OEMBED_PROVIDERS: readonly OEmbedProvider[] = [
  {
    name: "vimeo",
    displayName: "Vimeo",
    matcher: /^https?:\/\/(www\.)?vimeo\.com\/.+/i,
    endpoint: "https://vimeo.com/api/oembed.json",
  },
  {
    name: "vimeo-player",
    displayName: "Vimeo",
    matcher: /^https?:\/\/player\.vimeo\.com\/video\/.+/i,
    endpoint: "https://vimeo.com/api/oembed.json",
  },
];

const buildEndpointUrl = (provider: OEmbedProvider, url: string) => {
  const searchParams = new URLSearchParams({
    url,
    format: "json",
  });
  return `${provider.endpoint}?${searchParams.toString()}`;
};

const extractProvider = (url: string) =>
  OEMBED_PROVIDERS.find((provider) => provider.matcher.test(url)) ?? null;

const pickNumericSegment = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }
  const segments = value.split(/[/?#]/).filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (/^\d+$/.test(segments[index] ?? "")) {
      return segments[index] ?? null;
    }
  }
  return null;
};

export const extractVimeoVideoId = (value?: string | null) => {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    const numeric = pickNumericSegment(`${url.pathname}${url.hash}`);
    if (numeric) {
      return numeric;
    }
  } catch {
    // Ignore URL parsing errors and fall back to regex extraction.
  }
  const fallbackMatch = /(?:video\/|\/)(\d{5,})/i.exec(value);
  return fallbackMatch ? (fallbackMatch[1] ?? null) : null;
};

const normalizeResponse = (
  url: string,
  provider: OEmbedProvider,
  response: RawOEmbedResponse,
): OEmbedPayload | null => {
  if (!response.html) {
    return null;
  }

  return {
    url,
    html: response.html,
    providerName: response.provider_name ?? provider.displayName,
    title: response.title,
    width: typeof response.width === "number" ? response.width : undefined,
    height: typeof response.height === "number" ? response.height : undefined,
    thumbnailUrl: response.thumbnail_url,
    videoId: provider.name.startsWith("vimeo")
      ? (extractVimeoVideoId(url) ?? undefined)
      : undefined,
  };
};

export const isLikelyOEmbedUrl = (text: string) => {
  if (!text || /\s/.test(text)) {
    return false;
  }

  try {
    const candidate = new URL(text);
    return extractProvider(candidate.toString()) !== null;
  } catch {
    return false;
  }
};

export const fetchOEmbedPayload = async (
  url: string,
): Promise<OEmbedPayload | null> => {
  const provider = extractProvider(url);
  if (!provider) {
    return null;
  }

  try {
    const response = await fetch(buildEndpointUrl(provider, url));
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as RawOEmbedResponse;
    return normalizeResponse(url, provider, json);
  } catch {
    return null;
  }
};
