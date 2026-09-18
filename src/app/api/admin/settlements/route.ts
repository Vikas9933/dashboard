import { NextRequest, NextResponse } from "next/server";
import { jsonValidationError, mapServiceError } from "@/lib/api/response";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/session";
import { settlementActionSchema } from "@/lib/schemas/api";
import { requireFeature, SubscriptionFeatureError } from "@/lib/subscriptions/guard";

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, profile } = await requireAuth();
    await requireFeature(supabase, profile, "settlement_tracking");

    if (!hasPermission(profile, "settlement:approve")) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    const parsed = settlementActionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonValidationError(parsed.error);

    const status = parsed.data.action === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from("settlements")
      .update({ status, approved_by: profile.id, approved_at: new Date().toISOString() })
      .eq("id", parsed.data.settlementId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      userId: profile.id,
      action: parsed.data.action === "approve" ? "settlement.approve" : "settlement.reject",
      entity: "settlements",
      entityId: parsed.data.settlementId,
    });

    return NextResponse.json({ success: `Settlement ${status}.` });
  } catch (error) {
    if (error instanceof SubscriptionFeatureError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Action failed.";
    return mapServiceError(message);
  }
}
