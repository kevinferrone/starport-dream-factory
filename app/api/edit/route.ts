import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { textIsSafe, type AnyCard } from "@/lib/generate";
import { applyEdit, allText } from "@/lib/card-edit";
import { WEAPONS } from "@/lib/safety";
import type { Kind } from "@/lib/options";

// Saves words and numbers typed into the card editor. Free: no AI, no new picture.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { id, card: input } = (await req.json()) as { id: string; card: Record<string, unknown> };
  const db = createAdminClient();
  const { data: row } = await db.from("creations").select("kind, card").eq("id", id).eq("user_id", user.id).single();
  if (!row) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const card = applyEdit(row.kind as Kind, row.card as AnyCard, input ?? {});
  const words = allText(card);
  if (WEAPONS.test(words)) {
    return NextResponse.json(
      { error: "Starport has no weapons or sharp things. Try something silly instead, like a bubble wand or a tickle feather!" },
      { status: 400 }
    );
  }
  if (!(await textIsSafe(words))) {
    return NextResponse.json({ error: "Let's try different words on this card." }, { status: 400 });
  }

  const { error } = await db.from("creations").update({ card }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Couldn't save your changes." }, { status: 500 });
  return NextResponse.json({ card });
}
