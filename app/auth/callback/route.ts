import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-in links and Google both land here. We finish signing in, then go home.
// If anything fails, we go back to /login with the reason so it can be shown.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error_description") || searchParams.get("error");

  const back = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  if (providerError) return back(providerError);
  if (!code) return back("The sign-in link was missing its code. Please try again.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back(error.message);

  return NextResponse.redirect(`${origin}/`);
}
