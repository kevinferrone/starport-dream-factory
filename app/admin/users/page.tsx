import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { authInfo, monthStartIso, planOf, when } from "@/lib/admin";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const db = createAdminClient();

  let query = db
    .from("profiles")
    .select("id, email, tier, comp_tier, subscription_status, cancel_at_period_end, created_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(300);
  if (q?.trim()) query = query.ilike("email", `%${q.trim()}%`);
  const { data: users } = await query;

  const ids = (users ?? []).map((u) => u.id);
  const [{ data: made }, auth] = await Promise.all([
    ids.length
      ? db.from("creations").select("user_id, created_at, refunded").in("user_id", ids).limit(50000)
      : Promise.resolve({ data: [] as { user_id: string; created_at: string; refunded: boolean }[] }),
    authInfo(),
  ]);
  const month = monthStartIso();
  const tally = new Map<string, { total: number; month: number; last: string | null }>();
  for (const c of made ?? []) {
    const t = tally.get(c.user_id) ?? { total: 0, month: 0, last: null };
    t.total++;
    if (c.created_at >= month && !c.refunded) t.month++;
    if (!t.last || c.created_at > t.last) t.last = c.created_at;
    tally.set(c.user_id, t);
  }

  return (
    <>
      <h1 className="admin-title">Users</h1>
      <form className="admin-search" action="/admin/users">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search by email" aria-label="Search by email" />
        <button className="big-btn small" type="submit">Search</button>
        {q && <Link href="/admin/users">Clear</Link>}
      </form>
      <p className="hint">{users?.length ?? 0} shown{users?.length === 300 ? " (newest 300; search to find others)" : ""}.</p>

      <div className="table-scroll">
        <table className="admin">
          <thead>
            <tr>
              <th>Email</th><th>Plan</th><th>Cards this month</th><th>All cards</th><th>Last card</th><th>Last sign-in</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => {
              const t = tally.get(u.id);
              const a = auth.get(u.id);
              const plan = planOf(u);
              return (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`}>{u.email}</Link>
                    {u.is_admin && <span className="pill">admin</span>}
                  </td>
                  <td>
                    {plan.label}
                    {u.cancel_at_period_end && <span className="pill warn">cancelling</span>}
                    {u.subscription_status === "past_due" && <span className="pill warn">past due</span>}
                  </td>
                  <td>{t?.month ?? 0}</td>
                  <td>{t?.total ?? 0}</td>
                  <td className="nowrap">{when(t?.last)}</td>
                  <td className="nowrap">{when(a?.lastSignIn)}</td>
                  <td className="nowrap">{when(u.created_at, false)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
