import type { TenantSubscriptionContext } from "@/lib/types";
import { hasFeature } from "./features";

export function canAddUser(context: TenantSubscriptionContext | null): {
  allowed: boolean;
  message?: string;
} {
  if (!context) {
    return { allowed: false, message: "Organization context not found." };
  }
  if (context.isSuperAdmin) return { allowed: true };
  if (!hasFeature(context, "user_management")) {
    return { allowed: false, message: "User management is not included in your current plan." };
  }
  if (context.currentUserCount >= context.userLimit) {
    return {
      allowed: false,
      message: `User limit reached (${context.currentUserCount}/${context.userLimit}). Upgrade your plan to add more users.`,
    };
  }
  return { allowed: true };
}

export function canUseStorage(
  context: TenantSubscriptionContext | null,
  additionalMb: number
): { allowed: boolean; message?: string } {
  if (!context) {
    return { allowed: false, message: "Organization context not found." };
  }
  if (context.isSuperAdmin) return { allowed: true };
  if (!hasFeature(context, "allocation_module")) {
    return { allowed: false, message: "Data upload is not included in your current plan." };
  }
  const projected = context.currentStorageUsedMb + additionalMb;
  if (projected > context.storageLimitMb) {
    return {
      allowed: false,
      message: `Storage limit exceeded (${context.currentStorageUsedMb}/${context.storageLimitMb} MB used). Upgrade your plan for more storage.`,
    };
  }
  return { allowed: true };
}

/** Rough estimate: ~2 KB per portfolio row imported. */
export function estimateUploadStorageMb(rowCount: number): number {
  return Math.max(1, Math.ceil((rowCount * 2) / 1024));
}
