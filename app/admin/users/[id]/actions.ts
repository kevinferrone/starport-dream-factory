"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

/** Makes a one-time sign-in address for this user. The browser then opens it as a full page load. */
export async function loginAsUrl(id: string): Promise<{ url?: string; error?: string }> {
  const adminId = await requireAdmin();
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("email").eq("id", id).single();
  if (!p?.email) return { error: "This user has no email." };
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: p.email });
  if (error || !data?.properties?.hashed_token) return { error: error?.message ?? "Couldn't make a sign-in link." };
  await logActivity({ userId: id, actorId: adminId, kind: "admin_login_as" });
  return { url: `/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&switch=1` };
}
