const isAbsoluteUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value);

const trimTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

export const buildSupportApiUrl = (args: {
  path: string;
  apiBaseUrl?: string | null;
}): string => {
  const path = args.path.trim();
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const base = args.apiBaseUrl?.trim();
  if (base && isAbsoluteUrl(base)) {
    const normalizedBase = `${trimTrailingSlash(base)}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return new URL(normalizedPath, normalizedBase).toString();
  }

  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }

  return path;
};

