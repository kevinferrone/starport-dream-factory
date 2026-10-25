import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cardPieces, spokenText, allWords } from "@/lib/card-text";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSTRUCTIONS =
  "Read this game card aloud to a young child, like a warm, gentle storyteller. Calm, cheerful, unhurried, and clear. Pause briefly at each period.";

type Timing = { s: number; e: number };

/** Lines up the card's words with the spoken words so each one can be highlighted. */
function align(ours: string[], heard: { word: string; start: number; end: number }[]): Timing[] {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const out: (Timing | null)[] = ours.map(() => null);
  let j = 0;
  for (let i = 0; i < ours.length; i++) {
    const target = norm(ours[i]);
    if (!target) continue;
    for (let k = j; k < Math.min(heard.length, j + 5); k++) {
      if (norm(heard[k].word) === target) {
        out[i] = { s: heard[k].start, e: heard[k].end };
        j = k + 1;
        break;
      }
    }
  }
  // Fill any words we couldn't match by spreading them between their neighbours.
  const end = heard.length ? heard[heard.length - 1].end : ours.length * 0.35;
  let i = 0;
  while (i < out.length) {
    if (out[i]) {
      i++;
      continue;
    }
    let k = i;
    while (k < out.length && !out[k]) k++;
    const from = i > 0 ? out[i - 1]!.e : 0;
    const to = k < out.length ? out[k]!.s : end;
    const step = (to - from) / (k - i);
    for (let m = i; m < k; m++) out[m] = { s: from + step * (m - i), e: from + step * (m - i + 1) };
    i = k;
  }
  return out as Timing[];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  const { data: row } = await supabase.from("creations").select("kind, card").eq("id", id).single();
  if (!row) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const pieces = cardPieces(row.kind as Kind, row.card as AnyCard);
  const script = spokenText(pieces);
  const voice = process.env.OPENAI_TTS_VOICE || "sage";
  const key = createHash("sha1").update(`${voice}|card-v1|${script}`).digest("hex");
  const db = createAdminClient();
  const bucket = db.storage.from("card-images");
  const audioUrl = bucket.getPublicUrl(`voice/cards/${key}.mp3`).data.publicUrl;
  const timingUrl = bucket.getPublicUrl(`voice/cards/${key}.json`).data.publicUrl;

  // Already recorded? Hand it back.
  const cached = await fetch(timingUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (cached) return NextResponse.json({ audio: audioUrl, times: cached });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "sage",
      input: script,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
    });
    const mp3 = Buffer.from(await speech.arrayBuffer());
    await bucket.upload(`voice/cards/${key}.mp3`, mp3, { contentType: "audio/mpeg", upsert: true });

    // Ask for word-by-word timing of the recording.
    const heard = await openai.audio.transcriptions.create({
      file: await toFile(mp3, "card.mp3", { type: "audio/mpeg" }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });
    const times = align(allWords(pieces), (heard as unknown as { words?: { word: string; start: number; end: number }[] }).words ?? []);
    await bucket.upload(`voice/cards/${key}.json`, Buffer.from(JSON.stringify(times)), {
      contentType: "application/json",
      upsert: true,
    });

    return NextResponse.json({ audio: audioUrl, times });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't read this card right now." }, { status: 500 });
  }
}
