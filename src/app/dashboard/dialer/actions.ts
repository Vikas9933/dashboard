"use server";

import { logSimulatedCall, type LogSimulatedCallInput } from "@/lib/services/dialer-service";

export async function logCallAction(input: LogSimulatedCallInput) {
  return logSimulatedCall(input);
}
