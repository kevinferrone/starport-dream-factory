import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_REROLLS_PER_CARD } from "@/lib/access";
import { validateChoices, type Kind } from "@/lib/options";
import { rerollCard, type AnyCard } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

// "Shake up the stats" — free, keeps the picture.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  const db = createAdminClient();
  const { data: row } = await db
    .from("creations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  if (row.reroll_count >= MAX_REROLLS_PER_CARD) {
    return NextResponse.json({ error: "That's a lot of shaking! Try changing your buttons instead." }, { status: 429 });
  }

  const { difficulty, ...rest } = row.choices as { difficulty?: number | null; [k: string]: unknown };
  const choices = rest as Record<string, string[]>;
  const kind = row.kind as Kind;
  const check = validateChoices({ kind, choices, difficulty: difficulty ?? undefined, text: row.prompt_text ?? undefined });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  try {
    const card = await rerollCard(kind, check.labels, row.card as AnyCard, difficulty ?? undefined, row.prompt_text ?? undefined);
    await db
      .from("creations")
      .update({ card, reroll_count: row.reroll_count + 1 })
      .eq("id", id);
    return NextResponse.json({ card });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
