const MONDAY_API_URL = "https://api.monday.com/v2";

export const getMondayApiKey = () => {
  const apiKey = process.env.MONDAY_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("MONDAY_API_KEY is missing");
  return apiKey;
};

export const callMondayGraphQL = async <TData>(
  queryText: string,
  variables: Record<string, unknown>,
): Promise<TData> => {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: getMondayApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: queryText, variables }),
  });
  if (!response.ok) {
    throw new Error(`Monday API request failed (${response.status})`);
  }
  const json = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message = json.errors
      .map((e) => e.message)
      .filter(Boolean)
      .join(" | ");
    throw new Error(message || "Unknown Monday GraphQL error");
  }
  if (!json.data) throw new Error("Monday API returned no data");
  return json.data;
};
