import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The magic link lands here, signs the user in, then sends them home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/`);
}
