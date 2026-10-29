// Meta Conversions API: tells Meta, from the server, when a grown-up signs up or starts a paid plan,
// so ads can be measured. No pixel, no cookies, nothing on the kids' pages, nothing about kids.
// Turned off unless META_PIXEL_ID and META_CAPI_TOKEN are set in Vercel.
import { createHash } from "crypto";

const sha = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export async function sendMetaEvent(e: {
  name: "CompleteRegistration" | "Subscribe";
  email?: string | null;
  userId: string;
  value?: number; // dollars
  eventId: string; // unique per event, so a retry is never counted twice
}) {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.starportdreamfactory.com";
  const event = {
    event_name: e.name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: e.eventId,
    action_source: "website",
    event_source_url: e.name === "Subscribe" ? `${site}/plans` : `${site}/login`,
    user_data: {
      ...(e.email ? { em: [sha(e.email)] } : {}),
      external_id: [sha(e.userId)],
    },
    ...(e.value !== undefined ? { custom_data: { currency: "USD", value: e.value } } : {}),
  };
  try {
    const body: Record<string, unknown> = { data: [event] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("meta event", e.name, res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("meta event", e.name, err);
  }
}
