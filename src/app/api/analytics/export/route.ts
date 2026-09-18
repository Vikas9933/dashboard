import { NextRequest, NextResponse } from "next/server";
import { jsonValidationError, mapServiceError } from "@/lib/api/response";
import { exportFormatSchema } from "@/lib/schemas/api";
import { generateAnalyticsExport } from "@/lib/services/analytics-export-service";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireFeature, SubscriptionFeatureError } from "@/lib/subscriptions/guard";

export async function GET(request: NextRequest) {
  try {
    const profile = await getSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const supabase = await createClient();
    await requireFeature(supabase, profile, "advanced_analytics");

    const parsed = exportFormatSchema.safeParse(request.nextUrl.searchParams.get("format") ?? "xlsx");
    if (!parsed.success) return jsonValidationError(parsed.error);
    const format = parsed.data;

    const params: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "format") params[key] = value;
    });

    const { buffer, contentType, filename } = await generateAnalyticsExport(format, params);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof SubscriptionFeatureError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Export failed.";
    return mapServiceError(message);
  }
}
