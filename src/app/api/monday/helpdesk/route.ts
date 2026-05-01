import { type NextRequest, NextResponse } from "next/server";

import { createHelpdeskTicket, listHelpdeskTickets } from "~/server/monday/client";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  const submitterId = request.nextUrl.searchParams.get("submitterId") ?? undefined;
  try {
    const tickets = await listHelpdeskTickets({ submitterId });
    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tickets";
    console.error("[Helpdesk] Error fetching tickets:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const priority = typeof body.priority === "string" ? body.priority : "medium";
  const category = typeof body.category === "string" ? body.category : "general";
  const linkedContactId = typeof body.linkedContactId === "string" ? body.linkedContactId : undefined;
  const linkedContactName = typeof body.linkedContactName === "string" ? body.linkedContactName : undefined;
  const submitterId = typeof body.submitterId === "string" ? body.submitterId : undefined;

  if (!subject) {
    return NextResponse.json({ ok: false, error: "Subject is required" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });
  }

  try {
    const result = await createHelpdeskTicket({
      subject,
      description,
      priority,
      category,
      linkedContactId,
      linkedContactName,
      submitterId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create ticket";
    console.error("[Helpdesk] Error creating ticket:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};
