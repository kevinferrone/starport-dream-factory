import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedPhrases } from "@/lib/voice-phrases";

export const runtime = "nodejs";

const ALLOWED = allowedPhrases();

const INSTRUCTIONS =
  "Speak warmly and gently, like a kind children's librarian welcoming a young child. Soft, calm, cheerful and clear, with a smile in your voice. Say just the words, slowly.";

// Each phrase is recorded once in the warm voice, stored, and reused for everyone.
export async function GET(req: Request) {
  const text = new URL(req.url).searchParams.get("t") ?? "";
  if (!ALLOWED.has(text)) return NextResponse.json({ error: "Unknown phrase" }, { status: 400 });

  const voice = process.env.OPENAI_TTS_VOICE || "sage";
  const key = createHash("sha1").update(`${voice}|v1|${text}`).digest("hex");
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

  return NextResponse.redirect(publicUrl, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
