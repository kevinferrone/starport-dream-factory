import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import { validateChoices, fillRandom, pickedItem, type BuildInput } from "@/lib/options";
import { drawPlan } from "@/lib/patterns";
import { writeCard, drawPicture, textIsSafe, checkDrawing, type Drawing } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 150; // pictures can take up to a minute

const MAX_DRAWING_BYTES = 3_000_000;

/** Turns "data:image/jpeg;base64,..." into a Drawing. */
function parseDataUrl(url: string): Drawing | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(url);
  if (!m) return null;
  const data = Buffer.from(m[2], "base64");
  if (!data.length || data.length > MAX_DRAWING_BYTES) return null;
  return { data, mediaType: m[1] as Drawing["mediaType"] };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const input = (await req.json()) as BuildInput;
  const db = createAdminClient();

  // ---------- The drawing (new upload, or one from an earlier card) ----------
  let drawing: Drawing | undefined;
  let drawingPath: string | null = null;
  let newDrawingDataUrl: string | null = null;
  if (input.drawing) {
    const d = parseDataUrl(input.drawing);
    if (!d) return NextResponse.json({ error: "That picture didn't work. Try a smaller photo." }, { status: 400 });
    drawing = d;
    newDrawingDataUrl = input.drawing;
  } else if (input.drawingPath) {
    if (!input.drawingPath.startsWith(`drawings/${user.id}/`)) {
      return NextResponse.json({ error: "Drawing not found." }, { status: 400 });
    }
    const { data: blob } = await db.storage.from("card-images").download(input.drawingPath);
    if (blob) {
      const type = ["image/jpeg", "image/png", "image/webp"].includes(blob.type) ? blob.type : "image/jpeg";
      drawing = { data: Buffer.from(await blob.arrayBuffer()), mediaType: type as Drawing["mediaType"] };
      drawingPath = input.drawingPath;
    }
  }

  // ---------- Buttons: nothing picked and nothing drawn or typed → surprise picks ----------
  const choices = !drawing && !input.text?.trim() ? fillRandom(input.kind, input.choices ?? {}) : input.choices ?? {};
  const check = validateChoices({ ...input, choices });
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
  if (drawing && newDrawingDataUrl) {
    const problem = await checkDrawing(drawing, newDrawingDataUrl);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    drawingPath = `drawings/${user.id}/${randomUUID()}.jpg`;
    await db.storage.from("card-images").upload(drawingPath, drawing.data, { contentType: drawing.mediaType });
  }

  try {
    const { data: profile } = await db.from("profiles").select("reading_level").eq("id", user.id).single();
    const item = pickedItem(choices);
    const plan = drawPlan(
      input.kind,
      choices,
      input.difficulty,
      item ? { once: !!item.once, boosts: item.boosts ?? [] } : null
    );
    const card = await writeCard(
      input.kind,
      check.labels,
      input.difficulty,
      input.text,
      profile?.reading_level,
      drawing,
      plan.text
    );
    if (input.kind === "equipment" && plan.consumable !== undefined) {
      (card as { type: string }).type = plan.consumable ? "consumable" : "permanent";
    }
    const picture = await drawPicture(user.id, card, drawing);

    const { data, error } = await db
      .from("creations")
      .insert({
        user_id: user.id,
        kind: input.kind,
        choices: { ...choices, difficulty: input.difficulty ?? null, drawing_path: drawingPath },
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
