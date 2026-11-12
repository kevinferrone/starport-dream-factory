import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminIdOrNull } from "@/lib/admin";
import { CHARACTER_GROUPS, allOptions } from "@/lib/options";
import { iconPath } from "@/lib/hero-icons";

export const runtime = "nodejs";
export const maxDuration = 300;

const WHO = () => allOptions(CHARACTER_GROUPS.find((g) => g.id === "who")!);

/** One painted button icon: a KID version of the thing, head and shoulders, on a clear background. */
async function makeIcon(label: string, prompt: string | undefined) {
  const what = prompt ?? `a ${label.toLowerCase()} kid`;
  const res = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
    prompt:
      `A button icon for a kids' game: a cute KID version of ${what}. ` +
      `It must clearly read as a young child (big round head, big friendly eyes, chubby cheeks, small body), never an adult or a realistic animal. ` +
      `Head and shoulders, facing the viewer, smiling, centered and filling most of the square. ` +
      `Whimsical children's storybook style, bright saturated colors, soft clean outlines, simple shapes that read at a tiny size. ` +
      `Transparent background. No text, no frame, no shadow box. Nothing held, no weapons.`,
    size: "1024x1024",
    quality: "medium",
    background: "transparent",
    output_format: "png",
    n: 1,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image");
  return sharp(Buffer.from(b64, "base64")).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 86 }).toBuffer();
}

/** Admin only. Body: { ids: string[] } (up to 6 at a time). Makes or remakes those icons. */
export async function POST(req: Request) {
  if (!(await adminIdOrNull())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const opts = WHO().filter((o) => ids?.includes(o.id)).slice(0, 6);
  const db = createAdminClient();
  const results = await Promise.all(
    opts.map(async (o) => {
      try {
        const webp = await makeIcon(o.label, o.prompt);
        const { error } = await db.storage
          .from("card-images")
          .upload(iconPath(o.id), webp, { contentType: "image/webp", upsert: true, cacheControl: "300" });
        if (error) throw error;
        return { id: o.id, ok: true };
      } catch (e) {
        console.error("hero icon", o.id, e);
        return { id: o.id, ok: false };
      }
    })
  );
  return NextResponse.json({ results });
}
