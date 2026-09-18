import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/dashboard";
  const signupTenant = searchParams.get("tenant")?.trim().toLowerCase() ?? "";

  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (oauthError) {
    const message = oauthErrorDescription ?? oauthError;
    return NextResponse.redirect(
      `${origin}/login?error=oauth&message=${encodeURIComponent(message)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  let redirectPath = next;
  const supabaseResponse = NextResponse.redirect(`${origin}${redirectPath}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth&message=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (signupTenant) {
      await supabase.rpc("assign_profile_tenant", {
        p_user_id: user.id,
        p_tenant_slug: signupTenant,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_active) {
      redirectPath = "/pending-approval";
      const { notifyPendingSignup } = await import("@/lib/email/notifications");
      void notifyPendingSignup(user.id).catch((err) => {
        console.error("[oauth] Failed to send approval notification:", err);
      });
    }
  }

  if (redirectPath !== next) {
    const pendingResponse = NextResponse.redirect(`${origin}${redirectPath}`);
    copyCookies(supabaseResponse, pendingResponse);
    return pendingResponse;
  }

  return supabaseResponse;
}
