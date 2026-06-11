import { NextResponse } from "next/server";
import { readZohoContentToken } from "~/server/zoho/contentToken";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const payload = await readZohoContentToken(token);
    return new NextResponse(payload.html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
