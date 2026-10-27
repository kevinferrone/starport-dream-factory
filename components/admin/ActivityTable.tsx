import Link from "next/link";
import { when } from "@/lib/admin";
import { ACTIVITY_LABEL, type ActivityKind } from "@/lib/activity";

export default function ActivityTable({
  rows,
  emailOf,
}: {
  rows: { user_id: string | null; kind: string; detail: string | null; created_at: string }[];
  emailOf: Map<string, string>;
}) {
  if (!rows.length) return <p className="hint">Nothing yet.</p>;
  return (
    <div className="table-scroll">
      <table className="admin">
        <thead>
          <tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={i}>
              <td className="nowrap">{when(a.created_at)}</td>
              <td>{a.user_id ? <Link href={`/admin/users/${a.user_id}`}>{emailOf.get(a.user_id) ?? "(unknown)"}</Link> : "—"}</td>
              <td>{ACTIVITY_LABEL[a.kind as ActivityKind] ?? a.kind}</td>
              <td>{a.detail ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
