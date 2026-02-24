import { NextResponse } from "next/server";

import { env } from "~/env";

export const runtime = "nodejs";

const MONDAY_API_URL = "https://api.monday.com/v2";

const callMondayGraphQL = async <TData>(
  query: string,
  variables: Record<string, unknown>,
) => {
  if (!env.MONDAY_API_KEY) {
    throw new Error("MONDAY_API_KEY is missing");
  }

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: env.MONDAY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monday API request failed with ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: TData;
    errors?: { message?: string }[];
  };
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message =
      json.errors.map((error) => error.message).filter(Boolean).join(" | ") ||
      "Unknown Monday API error";
    throw new Error(message);
  }
  if (!json.data) {
    throw new Error("Monday API returned no data");
  }
  return json.data;
};

export const GET = async (
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) => {
  try {
    const { assetId } = await context.params;
    if (!assetId || assetId.trim().length === 0) {
      return new NextResponse("Missing asset id", { status: 400 });
    }

    const query = `
      query GetAsset($assetIds: [ID!]!) {
        assets(ids: $assetIds) {
          id
          public_url
          url
        }
      }
    `;
    interface AssetsData {
      assets?: Array<{ public_url?: string | null; url?: string | null }>;
    }

    const data = await callMondayGraphQL<AssetsData>(query, {
      assetIds: [assetId],
    });
    const asset = data.assets?.[0];
    const sourceUrl = asset?.public_url ?? asset?.url;
    if (!sourceUrl) {
      return new NextResponse("Asset not found", { status: 404 });
    }

    const upstream = await fetch(sourceUrl, { cache: "no-store" });
    if (!upstream.ok) {
      return new NextResponse("Failed to fetch asset", { status: upstream.status });
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset proxy error";
    return new NextResponse(message, { status: 500 });
  }
};
