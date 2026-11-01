import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnyCard } from "@/lib/generate";

export const runtime = "nodejs";

// Same voice and wording as /api/voice, so a card name sounds exactly like every other button.
const INSTRUCTIONS =
  "Speak warmly and gently, like a kind children's librarian welcoming a young child. Soft, calm, cheerful and clear, with a smile in your voice. Say just the words, slowly.";

/** Says one of the signed-in family's own card names (used by Puzzle Lab). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  // Row-level security only returns the family's own, non-deleted cards.
  const { data: row } = await supabase.from("creations").select("card").eq("id", id).single();
  const name = ((row?.card as AnyCard | undefined)?.name ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  // Optional w = the exact word shown in the puzzle (the whole name, or one word of it, e.g. TROLL).
  const w = (new URL(req.url).searchParams.get("w") ?? "").toUpperCase();
  const letters = (x: string) => x.toUpperCase().replace(/[^A-Z]/g, "");
  let text = name;
  if (w && letters(name) !== w) {
    const part = name.split(/[\s-]+/).find((p) => letters(p) === w);
    if (!part) return NextResponse.json({ error: "Word not on this card." }, { status: 404 });
    text = part.replace(/[^A-Za-z']/g, "");
  }

  const voice = process.env.OPENAI_TTS_VOICE || "sage";
  const key = createHash("sha1").update(`${voice}|v1|${text}`).digest("hex"); // same key scheme as /api/voice
  const path = `voice/${key}.mp3`;
  const db = createAdminClient();
  const publicUrl = db.storage.from("card-images").getPublicUrl(path).data.publicUrl;

  const exists = await fetch(publicUrl, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
  if (!exists) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "coral",
      input: text,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
    });
    const bytes = Buffer.from(await audio.arrayBuffer());
    await db.storage.from("card-images").upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
  }
  return NextResponse.redirect(publicUrl, { status: 302, headers: { "Cache-Control": "private, max-age=86400" } });
}
