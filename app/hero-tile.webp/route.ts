import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TILE_PATH } from "@/lib/hero-icons";

export const runtime = "nodejs";

/** The Characters tile: the painted full-body Pockets once it's made in Admin, else the round portrait. */
export async function GET(req: Request) {
  const { data } = await createAdminClient().storage.from("card-images").download(TILE_PATH);
  if (!data) return NextResponse.redirect(new URL("/tiles/character.webp", req.url), 307);
  return new NextResponse(Buffer.from(await data.arrayBuffer()), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
