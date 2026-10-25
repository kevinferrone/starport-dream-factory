import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import { validateChoices, type BuildInput } from "@/lib/options";
import { writeCard, drawPicture, textIsSafe } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 120; // pictures can take up to a minute

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const input = (await req.json()) as BuildInput;
  const check = validateChoices(input);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const access = await getAccess(user.id);
  if (!access.parentConfirmed) {
    return NextResponse.json({ error: "A grown-up needs to finish setting up this account first.", code: "parent" }, { status: 403 });
  }
  if (access.remaining <= 0) {
    return NextResponse.json({ error: "You've used all your creations for now!", code: "limit" }, { status: 402 });
  }

  if (!(await textIsSafe(input.text))) {
    return NextResponse.json({ error: "Let's try different words in the idea box." }, { status: 400 });
  }

  try {
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("reading_level")
      .eq("id", user.id)
      .single();
    const card = await writeCard(input.kind, check.labels, input.difficulty, input.text, profile?.reading_level);
    const picture = await drawPicture(user.id, card);

    const db = createAdminClient();
    const { data, error } = await db
      .from("creations")
      .insert({
        user_id: user.id,
        kind: input.kind,
        choices: { ...input.choices, difficulty: input.difficulty ?? null },
        prompt_text: input.text?.trim() || null,
        card,
        image_url: picture.url,
        image_path: picture.path,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
