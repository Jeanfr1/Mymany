import { requireAdmin } from "@/lib/auth";
import { listRecentJobs } from "@/lib/repos/dashboard";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { reprocessJobAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  await requireAdmin();
  const jobs = await listRecentJobs(100);

  return (
    <div>
      <PageHeader
        title="Queue"
        subtitle="Outbound jobs (private replies, messages, reminders), most recent first."
      />
      {jobs.length === 0 ? (
        <EmptyState>No jobs yet. They appear when automations match.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatDateTime(j.created_at)}
                  </td>
                  <td className="px-4 py-3">{j.job_type}</td>
                  <td className="px-4 py-3">
                    <Badge status={j.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {j.attempts}/{j.max_attempts}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatDateTime(j.scheduled_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs">
                    {j.skip_reason && <div>skip: {j.skip_reason}</div>}
                    {j.last_error && (
                      <div className="text-danger">{j.last_error}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(j.status === "failed" || j.status === "skipped") && (
                      <form action={reprocessJobAction}>
                        <input type="hidden" name="id" value={j.id} />
                        <button className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-card">
                          Reprocess
                        </button>
                      </form>
                    )}
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
