"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAnswer, passValue, GROWNUP_COOKIE } from "@/lib/grownup";

export async function answerGrownup(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const token = String(formData.get("token") ?? "");
  const answer = Number(String(formData.get("answer") ?? "").trim());
  const next = String(formData.get("next") ?? "/plans");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/plans";
  if (!checkAnswer(token, answer)) redirect(`/grownups?next=${encodeURIComponent(safeNext)}&wrong=1`);
  const pass = passValue(user.id);
  (await cookies()).set(GROWNUP_COOKIE, pass.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: pass.maxAge,
  });
  redirect(safeNext);
}
