type RequestOptions = {
  sessionToken?: string | null;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export const fetchMondayApi = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { sessionToken, method = "GET", body } = options;
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-monday-session-token": sessionToken } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json()) as T;
  return payload;
};
