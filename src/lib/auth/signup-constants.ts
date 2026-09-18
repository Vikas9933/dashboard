export const DEFAULT_SIGNUP_TENANT_SLUG = "default";

export function signupPath(tenantSlug = DEFAULT_SIGNUP_TENANT_SLUG) {
  return `/signup?tenant=${encodeURIComponent(tenantSlug)}`;
}
