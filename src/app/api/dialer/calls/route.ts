import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonValidationError, mapServiceError } from "@/lib/api/response";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireFeature, SubscriptionFeatureError } from "@/lib/subscriptions/guard";
import { ingestDialerCalls } from "@/lib/services/dialer-performance-service";
import { logAudit } from "@/lib/audit";

const callSchema = z.object({
  loan_number: z.string().min(1).optional(),
  account_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  phone_number: z.string().optional(),
  call_started_at: z.string().optional(),
  duration_seconds: z.coerce.number().int().min(0).max(86400).optional(),
  connected: z.boolean().optional(),
  rpc: z.boolean().optional(),
  follow_up: z.boolean().optional(),
  outcome: z.string().optional(),
  external_call_id: z.string().optional(),
  dialer_source: z.string().optional(),
  remarks: z.string().optional(),
});

const ingestSchema = z
  .object({
    calls: z.array(callSchema).min(1).max(500).optional(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const profile = await getSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const supabase = await createClient();
    await requireFeature(supabase, profile, "dialer_management");

    const body: unknown = await request.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) return jsonValidationError(parsed.error);

    const rawCalls = parsed.data.calls ?? [body];
    const callsParsed = z.array(callSchema).min(1).max(500).safeParse(rawCalls);
    if (!callsParsed.success) return jsonValidationError(callsParsed.error);

    const result = await ingestDialerCalls(callsParsed.data);

    await logAudit({
      userId: profile.id,
      tenantId: profile.tenant_id,
      action: "dialer.ingest",
      entity: "dialer_calls",
      payload: { inserted: result.inserted, skipped: result.skipped, errorCount: result.errors.length },
    });

    return NextResponse.json(result, { status: result.errors.length && !result.inserted ? 400 : 200 });
  } catch (error) {
    if (error instanceof SubscriptionFeatureError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Dialer ingest failed.";
    return mapServiceError(message);
  }
}
