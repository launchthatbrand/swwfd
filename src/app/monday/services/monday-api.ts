type RequestOptions = {
  sessionToken?: string | null;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Pass `"no-store"` to bypass the browser cache (default for most Monday API calls). */
  cache?: RequestCache;
};

export const fetchMondayApi = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { sessionToken, method = "GET", body, cache = "no-store" } = options;
  const response = await fetch(path, {
    method,
    cache,
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-monday-session-token": sessionToken } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json()) as T;
  return payload;
};
