import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonValidationError(error: ZodError) {
  return NextResponse.json(
    { error: error.errors[0]?.message ?? "Invalid request." },
    { status: 400 }
  );
}

export function mapServiceError(message: string) {
  if (message.includes("not permitted") || message.includes("Insufficient") || message.includes("Admin")) {
    return jsonError(message, 403);
  }
  if (message.includes("Not authenticated") || message.includes("pending approval")) {
    return jsonError(message, 401);
  }
  return jsonError(message, 500);
}
