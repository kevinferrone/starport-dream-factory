import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Hides a card. The row stays so it still counts toward the plan limit.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  await createAdminClient()
    .from("creations")
    .update({ status: "deleted" })
    .eq("id", id)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
