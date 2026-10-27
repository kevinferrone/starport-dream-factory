import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityKind =
  | "signup"
  | "build"
  | "subscribed"
  | "plan_changed"
  | "cancel_scheduled"
  | "cancel_undone"
  | "subscription_ended"
  | "payment_problem"
  | "admin_login_as"
  | "admin_restore"
  | "admin_unrestore"
  | "admin_comp"
  | "admin_signin_link";

/** Records something that happened, for the admin Activity page. Never blocks the main action. */
export async function logActivity(a: { userId: string | null; kind: ActivityKind; detail?: string; actorId?: string | null }) {
  try {
    await createAdminClient()
      .from("activity")
      .insert({ user_id: a.userId, actor_id: a.actorId ?? null, kind: a.kind, detail: a.detail ?? null });
  } catch (e) {
    console.error("logActivity", e);
  }
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  signup: "Signed up",
  build: "Made a card",
  subscribed: "Subscribed",
  plan_changed: "Changed plan",
  cancel_scheduled: "Cancelled (ends at period end)",
  cancel_undone: "Undid cancellation",
  subscription_ended: "Subscription ended",
  payment_problem: "Payment problem",
  admin_login_as: "Admin logged in as user",
  admin_restore: "Admin restored a creation",
  admin_unrestore: "Admin undid a restore",
  admin_comp: "Admin changed free access",
  admin_signin_link: "Admin sent a sign-in link",
};
