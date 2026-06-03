import { NextResponse } from "next/server";

import { callMondayGraphQL } from "~/server/monday/client";

export const runtime = "nodejs";

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
