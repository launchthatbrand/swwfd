import "server-only";

const parseForwardedHeaderValue = (value: string | null) => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
};

const toSafeProtocol = (value: string | null, fallback: "http" | "https") => {
  if (!value) return fallback;
  const normalized = value.replace(/:$/, "").toLowerCase();
  if (normalized === "http" || normalized === "https") {
    return normalized;
  }
  return fallback;
};

export const getRequestOrigin = (request: Request) => {
  const requestUrl = new URL(request.url);
  const forwardedHost = parseForwardedHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = forwardedHost ?? requestUrl.host;
  const forwardedProto = parseForwardedHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  let protocol = toSafeProtocol(forwardedProto, toSafeProtocol(requestUrl.protocol, "https"));

  // Vercel deployments should always use HTTPS externally.
  if (host.endsWith(".vercel.app")) {
    protocol = "https";
  }

  return `${protocol}://${host}`;
};
