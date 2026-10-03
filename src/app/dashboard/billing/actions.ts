"use server";

import {
  saveBillingRule,
  deleteBillingRule,
  toggleBillingRule,
  updateBillingStatus,
  bulkApproveBilling,
  recalculateAllBilling,
  type BillingRule,
  type BillingRuleType,
  type BillingApprovalStatus,
  type BillingPaymentStatus,
} from "@/lib/services/billing-service";

export async function saveBillingRuleAction(
  rule: Partial<BillingRule> & { name: string; ruleType: BillingRuleType }
) {
  return saveBillingRule(rule);
}

export async function deleteBillingRuleAction(ruleId: string) {
  return deleteBillingRule(ruleId);
}

export async function toggleBillingRuleAction(ruleId: string, isActive: boolean) {
  return toggleBillingRule(ruleId, isActive);
}

export async function updateBillingStatusAction(
  billingId: string,
  approvalStatus: BillingApprovalStatus,
  paymentStatus?: BillingPaymentStatus,
  paymentRef?: string,
  notes?: string,
  approverName?: string
) {
  return updateBillingStatus(
    billingId,
    approvalStatus,
    paymentStatus,
    paymentRef,
    notes,
    approverName
  );
}

export async function bulkApproveBillingAction(
  billingIds: string[],
  approverName?: string
) {
  return bulkApproveBilling(billingIds, approverName);
}

export async function recalculateBillingAction() {
  return recalculateAllBilling();
}
