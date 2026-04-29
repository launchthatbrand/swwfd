import { NextResponse } from "next/server";

import { uploadMondayRecordFile } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const POST = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return toJson({ ok: false, error: "Invalid multipart form data" }, 400);
  }

  const uploaded = formData.get("file");
  if (!(uploaded instanceof File)) {
    return toJson({ ok: false, error: "Missing file in form-data" }, 400);
  }
  if (uploaded.size <= 0) {
    return toJson({ ok: false, error: "Uploaded file is empty" }, 400);
  }

  try {
    const result = await uploadMondayRecordFile({
      itemId,
      file: uploaded,
      filename: uploaded.name || "resume",
      columnId: "files__1",
    });
    return toJson({ ok: true, itemId: result.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload resume file";
    return toJson({ ok: false, error: message }, 500);
  }
};
