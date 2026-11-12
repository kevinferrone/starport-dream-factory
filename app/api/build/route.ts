import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess, RESTING_MESSAGE } from "@/lib/access";
import { validateChoices, fillRandom, pickedItem, type BuildInput } from "@/lib/options";
import { drawPlan } from "@/lib/patterns";
import { logActivity } from "@/lib/activity";
import {
  writeCard,
  writeCharacter,
  drawPicture,
  mustShow,
  textIsSafe,
  checkDrawing,
  matchToPicture,
  type Drawing,
  type AnyCard,
} from "@/lib/generate";
import { describeCharacter, characterStyle, characterMusts, type Brought } from "@/lib/hero";

export const runtime = "nodejs";
export const maxDuration = 300; // a picture can take up to a minute, and a wrong one is redrawn (up to 2 times)

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

  // ---------- Characters: the saved pets and equipment the kid brought ----------
  const brought: (Brought & { image: Drawing | null })[] = [];
  if (input.kind === "character" && input.bring?.length) {
    const ids = [...new Set(input.bring)].slice(0, 3);
    const { data: rows } = await db
      .from("creations")
      .select("id, kind, card, choices, image_path")
      .in("id", ids)
      .eq("user_id", user.id)
      .in("kind", ["pet", "equipment"]);
    for (const id of ids) {
      const row = rows?.find((x) => x.id === id);
      if (!row) continue;
      const card = row.card as AnyCard;
      const ch = (row.choices ?? {}) as Record<string, unknown>;
      let image: Drawing | null = null;
      if (row.image_path) {
        const { data: blob } = await db.storage.from("card-images").download(row.image_path as string);
        if (blob) image = { data: Buffer.from(await blob.arrayBuffer()), mediaType: "image/png" };
      }
      brought.push({
        id,
        kind: row.kind as "pet" | "equipment",
        name: card.name,
        look: (card.image_prompt || card.description || "").slice(0, 400),
        itemType: row.kind === "equipment" ? ((ch.item as string[] | undefined)?.[0] ?? null) : null,
        size: row.kind === "pet" ? ((ch.size as string[] | undefined)?.[0] ?? null) : null,
        image,
      });
    }
  }

  // ---------- Buttons: nothing picked and nothing drawn or typed → surprise picks ----------
  const choices =
    !drawing && !input.text?.trim() && !brought.length && !input.heroName?.trim()
      ? fillRandom(input.kind, input.choices ?? {})
      : input.choices ?? {};
  const check = validateChoices({ ...input, choices });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const access = await getAccess(user.id);
  if (!access.parentConfirmed) {
    return NextResponse.json({ error: "A grown-up needs to finish setting up this account first.", code: "parent" }, { status: 403 });
  }
  if (access.resting) {
    return NextResponse.json({ error: RESTING_MESSAGE, code: "rest" }, { status: 429 });
  }
  if (access.remaining <= 0) {
    return NextResponse.json({ error: "You've used all your creations for now!", code: "limit" }, { status: 402 });
  }

  if (!(await textIsSafe(input.text)) || !(await textIsSafe(input.heroName))) {
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

    // ---------- Characters: a picture-only hero card ----------
    if (input.kind === "character") {
      const refs = brought.filter((b) => b.image);
      const card = await writeCharacter(
        describeCharacter(choices, brought, {
          text: input.text,
          heroName: input.heroName,
          hasDrawing: !!drawing,
          hasRefs: refs.length > 0,
        }),
        profile?.reading_level,
        drawing,
        refs.map((b) => b.image!),
        input.heroName
      );
      const job = check.labels["What is your job?"]?.[0];
      Object.assign(card, { ...(job ? { job } : {}), ...(brought.length ? { with: brought.map((b) => b.name) } : {}) });
      const drawn = await drawPicture(user.id, card, drawing, characterMusts(choices, brought), {
        style: characterStyle(choices),
        refs: refs.map((b) => b.image!),
        refNames: refs.map((b) => b.name),
      });
      const matched = await matchToPicture("character", card, drawn.url, profile?.reading_level);
      Object.assign(card, {
        name: input.heroName?.trim() || matched.name,
        description: matched.description,
        image_prompt: matched.image_prompt,
      });
      const { data, error } = await db
        .from("creations")
        .insert({
          user_id: user.id,
          kind: "character",
          choices: {
            ...choices,
            bring: brought.map((b) => b.id),
            hero_name: input.heroName?.trim() || null,
            drawing_path: drawingPath,
            pictures: drawn.pictures,
            quality: drawn.quality,
          },
          prompt_text: input.text?.trim() || null,
          card,
          image_url: drawn.url,
          image_path: drawn.path,
          ...(access.planLeft <= 0 && access.bonusLeft > 0 ? { bonus: true } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      await logActivity({ userId: user.id, kind: "build", detail: `character: ${card.name}` });
      return NextResponse.json({ id: data.id });
    }

    const item = pickedItem(choices);
    const plan = drawPlan(
      input.kind,
      choices,
      input.difficulty,
      item ? { once: !!item.once, boosts: item.boosts ?? [] } : null,
      input.coins ?? undefined
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
    // The kid picked the price, so it's exactly that.
    if (input.coins && input.kind !== "creature") (card as { cost: number }).cost = input.coins;
    const drawn = await drawPicture(user.id, card, drawing, mustShow(check.labels));
    const picture = drawn;
    // Make the words match what was actually drawn.
    const matched = await matchToPicture(input.kind, card, drawn.url, profile?.reading_level);
    Object.assign(card, { name: matched.name, description: matched.description, image_prompt: matched.image_prompt });

    const { data, error } = await db
      .from("creations")
      .insert({
        user_id: user.id,
        kind: input.kind,
        choices: { ...choices, difficulty: input.difficulty ?? null, coins: input.coins ?? null, drawing_path: drawingPath, pictures: drawn.pictures, quality: drawn.quality },
        prompt_text: input.text?.trim() || null,
        card,
        image_url: picture.url,
        image_path: picture.path,
        // Plan used up but a Puzzle Lab bonus is waiting: this card uses the bonus.
        ...(access.planLeft <= 0 && access.bonusLeft > 0 ? { bonus: true } : {}),
      })
      .select("id")
      .single();
    if (error) throw error;
    await logActivity({ userId: user.id, kind: "build", detail: `${input.kind}: ${card.name}` });

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
