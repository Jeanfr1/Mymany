import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllAutomations } from "@/lib/repos/automations";
import { listAccounts } from "@/lib/repos/accounts";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { toggleAutomationAction } from "./actions";

export default async function AutomationsPage() {
  await requireAdmin();
  const [automations, accounts] = await Promise.all([
    listAllAutomations(),
    listAccounts(),
  ]);
  const accountLabel = new Map(
    accounts.map((a) => [a.id, `@${a.instagram_username ?? a.instagram_user_id}`]),
  );

  const triggers = (a: (typeof automations)[number]) =>
    [
      a.trigger_comment && "comment",
      a.trigger_story_reply && "story",
      a.trigger_direct_message && "DM",
    ]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div>
      <PageHeader
        title="Automations"
        subtitle="Rules that reply to comments, story replies, and DMs."
        action={
          <Link
            href="/dashboard/automations/new"
            className="inline-block rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg"
          >
            + New automation
          </Link>
        }
      />

      {automations.length === 0 ? (
        <EmptyState>
          No automations yet. Create one to start replying to keywords.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Triggers</th>
                <th className="px-4 py-3">Keywords</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/automations/${a.id}`}
                      className="hover:text-brand"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {accountLabel.get(a.instagram_account_id) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{triggers(a)}</td>
                  <td className="px-4 py-3 text-muted">
                    {a.match_type === "any"
                      ? "(any)"
                      : a.keywords.slice(0, 3).join(", ") +
                        (a.keywords.length > 3 ? "…" : "")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={a.active ? "active" : "inactive"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <form action={toggleAutomationAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={(!a.active).toString()}
                        />
                        <button className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-card">
                          {a.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <Link
                        href={`/dashboard/automations/${a.id}`}
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-card"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
