import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email sign-in links point here, on our own domain (not supabase.co), so mail
// filters see a link that matches the sender. Works on any device.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const back = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  if (!tokenHash || !type) return back("The sign-in link was incomplete. Please ask for a new one.");

  const supabase = await createClient();
  // Switching accounts (admin "Log in as"): drop the current session in this browser first.
  if (searchParams.get("switch")) await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return back("That sign-in link has expired or was already used. Please ask for a new one.");

  return NextResponse.redirect(`${origin}/`);
}
