import { requireAdmin } from "@/lib/auth";
import { listRecentEvents } from "@/lib/repos/dashboard";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  await requireAdmin();
  const events = await listRecentEvents(100);

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Inbound webhook events (comments, DMs, story replies), most recent first."
      />
      {events.length === 0 ? (
        <EmptyState>
          No events yet. They appear here when Instagram sends webhooks.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Comment / Media</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatDateTime(e.received_at)}
                  </td>
                  <td className="px-4 py-3">{e.event_type}</td>
                  <td className="px-4 py-3">
                    <Badge status={e.processing_status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {e.comment_id ?? e.media_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-danger">
                    {e.processing_error ?? ""}
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
