import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async () => {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Deprecated endpoint. Monday records now load via Convex actions. Use the board UI data pipeline instead.",
    },
    { status: 410 },
  );
};
