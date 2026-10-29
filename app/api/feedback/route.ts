import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { CONTACT_EMAIL } from "@/lib/site";

const KINDS = { bug: "Bug report", feature: "Feature request" } as const;
const MAX_PER_DAY = 10;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "Report a bug" and "Request a feature": emails the message to Wider Path.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = (await req.json().catch(() => ({}))) as { kind?: string; message?: string; page?: string };
  const kind = body.kind === "feature" ? "feature" : body.kind === "bug" ? "bug" : null;
  const message = String(body.message ?? "").trim().slice(0, 4000);
  const page = String(body.page ?? "").slice(0, 300);
  if (!kind || message.length < 3) {
    return NextResponse.json({ error: "Please write a little more before sending." }, { status: 400 });
  }

  // A light limit so the inbox can't be flooded.
  if (user) {
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await createAdminClient()
      .from("activity")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "feedback")
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_DAY) {
      return NextResponse.json({ error: "Thanks! You've sent a lot today. Please try again tomorrow." }, { status: 429 });
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Messages can't be sent right now. Please email us instead." }, { status: 500 });

  const from = user?.email ?? "a visitor who isn't signed in";
  const subject = `${KINDS[kind]}: ${message.split("\n")[0].slice(0, 60)}`;
  const html = `<h2 style="margin:0 0 8px">${KINDS[kind]}</h2>
<p style="margin:0 0 4px"><b>From:</b> ${esc(from)}</p>
<p style="margin:0 0 4px"><b>Page:</b> ${esc(page || "unknown")}</p>
<p style="margin:0 0 12px"><b>Browser:</b> ${esc(req.headers.get("user-agent") ?? "unknown")}</p>
<div style="white-space:pre-wrap;padding:12px;border-radius:8px;background:#f4f2ff">${esc(message)}</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Starport Dream Factory <hello@starportdreamfactory.com>",
      to: [CONTACT_EMAIL],
      reply_to: user?.email ? [user.email] : undefined,
      subject,
      html,
      text: `${KINDS[kind]}\nFrom: ${from}\nPage: ${page}\n\n${message}`,
    }),
  });
  if (!res.ok) {
    console.error("feedback email", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Your message didn't send. Please try again in a minute." }, { status: 502 });
  }

  await logActivity({ userId: user?.id ?? null, kind: "feedback", detail: `${KINDS[kind]}: ${message.slice(0, 120)}` });
  return NextResponse.json({ ok: true });
}
