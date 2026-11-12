import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminIdOrNull } from "@/lib/admin";
import { TILE_PATH } from "@/lib/hero-icons";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Admin only: paints the Characters tile, a full-body Pockets on a clear background, from her portrait. */
export async function POST(req: Request) {
  if (!(await adminIdOrNull())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  try {
    const portrait = await (await fetch(new URL("/tiles/character.webp", req.url))).arrayBuffer();
    const png = await sharp(Buffer.from(portrait)).png().toBuffer();
    const res = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      image: await toFile(png, "pockets.png", { type: "image/png" }),
      prompt:
        "Draw this same girl, Pockets, as a FULL-BODY character, head to toe. Keep her exactly: her face and big brown eyes, freckles, warm brown skin, " +
        "curly dark brown shoulder-length hair with a little beaded braid and a feather charm, and her patchwork coat covered in colorful pockets " +
        "(teal, mustard, plum, coral and blue patches with brass buttons, a pencil, a rolled-up map and a thread spool poking out). " +
        "Add a cream shirt, brown pants and sturdy little boots. Cheerful standing pose, one hand waving, big smile. She is a young kid. " +
        "Style: a bright, clean cartoon sticker like a kids' game button icon: soft bold outlines, simple shading, saturated colors. " +
        "Transparent background: no circle, no frame, no sky, no ground, no shadow, no text.",
      size: "1024x1536",
      quality: "high",
      background: "transparent",
      output_format: "png",
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("No picture came back.");
    const webp = await sharp(Buffer.from(b64, "base64"))
      .trim()
      .resize(560, 560, { fit: "inside" })
      .webp({ quality: 88 })
      .toBuffer();
    const { error } = await createAdminClient()
      .storage.from("card-images")
      .upload(TILE_PATH, webp, { contentType: "image/webp", upsert: true, cacheControl: "300" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("hero tile", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't paint the tile." }, { status: 500 });
  }
}
