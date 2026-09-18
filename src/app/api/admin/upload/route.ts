import { NextRequest, NextResponse } from "next/server";
import { jsonValidationError, mapServiceError } from "@/lib/api/response";
import { requirePermission } from "@/lib/auth/session";
import { uploadRequestSchema } from "@/lib/schemas/api";
import { processAccountUpload } from "@/lib/services/upload-service";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requirePermission("admin:upload");
    const parsed = uploadRequestSchema.safeParse(await request.json());
    if (!parsed.success) return jsonValidationError(parsed.error);

    const result = await processAccountUpload(supabase, profile, parsed.data.rows);
    if (result.error) {
      return NextResponse.json({ error: result.error, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return mapServiceError(message);
  }
}
