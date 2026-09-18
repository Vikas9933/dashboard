import { NextRequest, NextResponse } from "next/server";
import { jsonValidationError, mapServiceError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { auditLogsQuerySchema } from "@/lib/schemas/api";
import { fetchAuditLogs } from "@/lib/services/audit-service";
import { requireFeature, SubscriptionFeatureError } from "@/lib/subscriptions/guard";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireAdmin();
    await requireFeature(supabase, profile, "audit_logs");

    const parsed = auditLogsQuerySchema.safeParse({      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      offset: request.nextUrl.searchParams.get("offset") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
    });

    if (!parsed.success) return jsonValidationError(parsed.error);

    const logs = await fetchAuditLogs(supabase, parsed.data);
    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    if (error instanceof SubscriptionFeatureError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs.";    return mapServiceError(message);
  }
}
