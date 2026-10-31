// "Send me Starport news" consent. Saved on the grown-up's profile and, when the
// Mailchimp keys are set, added to (or removed from) the Starport Mailchimp audience.
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const KEY = process.env.MAILCHIMP_API_KEY; // ends in the data center, e.g. "...-us21"
const LIST = process.env.MAILCHIMP_AUDIENCE_ID;
const TAG = "Dream Factory";

async function mailchimp(email: string, subscribe: boolean) {
  if (!KEY || !LIST) return; // Not connected yet: the choice is still saved and can be exported.
  const dc = KEY.split("-").pop();
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  const base = `https://${dc}.api.mailchimp.com/3.0/lists/${LIST}/members/${hash}`;
  const auth = { Authorization: `Basic ${Buffer.from(`anystring:${KEY}`).toString("base64")}`, "Content-Type": "application/json" };
  try {
    const res = await fetch(base, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify(
        subscribe
          ? { email_address: email, status_if_new: "subscribed", status: "subscribed" }
          : { email_address: email, status_if_new: "unsubscribed", status: "unsubscribed" }
      ),
    });
    if (subscribe && res.ok) {
      await fetch(`${base}/tags`, { method: "POST", headers: auth, body: JSON.stringify({ tags: [{ name: TAG, status: "active" }] }) });
    }
    if (!res.ok) console.error("Mailchimp", res.status, await res.text());
  } catch (e) {
    console.error("Mailchimp", e);
  }
}

/** Saves the grown-up's choice and passes it on to Mailchimp. */
export async function setNewsOptIn(userId: string, email: string | undefined, yes: boolean) {
  await createAdminClient()
    .from("profiles")
    .update({ news_opt_in: yes, news_opt_in_at: new Date().toISOString() })
    .eq("id", userId);
  if (email) await mailchimp(email, yes);
}
