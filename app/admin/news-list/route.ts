import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Everyone who said yes to Starport news, as a CSV you can import into Mailchimp.
export async function GET() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("profiles")
    .select("email, news_opt_in_at")
    .eq("news_opt_in", true)
    .order("news_opt_in_at", { ascending: true });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Email Address", "Opted in", "Tags"], ...(data ?? []).map((r) => [r.email, r.news_opt_in_at, "Dream Factory"])];
  return new Response(rows.map((r) => r.map(esc).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="starport-news-optins.csv"`,
    },
  });
}
