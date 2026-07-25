import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/repos/dashboard";
import { StatCard, PageHeader, Card } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireAdmin();
  const s = await getDashboardStats();

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Health and activity across your connected accounts."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Connected accounts"
          value={`${s.connectedAccounts}/${s.accounts}`}
          tone={s.connectedAccounts > 0 ? "success" : "default"}
        />
        <StatCard label="Active automations" value={s.activeAutomations} />
        <StatCard
          label="Pending jobs"
          value={s.pendingJobs}
          tone={s.pendingJobs > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Failed jobs"
          value={s.failedJobs}
          tone={s.failedJobs > 0 ? "danger" : "default"}
        />
        <StatCard label="Sending now" value={s.sendingJobs} />
        <StatCard label="Skipped" value={s.skippedJobs} />
        <StatCard label="Events (24h)" value={s.eventsLast24h} />
        <StatCard
          label="Last webhook"
          value={timeAgo(s.lastWebhookAt)}
          tone={s.lastWebhookAt ? "default" : "warning"}
        />
      </div>

      <Card className="mt-6 text-sm text-muted">
        <b className="text-foreground">Getting started:</b> Connect an account
        (Connection), create an automation (Automations), pick a post if needed
        (Posts), then activate it. Watch inbound events and outbound jobs in the
        Events and Queue tabs. Pacing and limits shown here are internal
        operational settings, not official Meta limits.
      </Card>
    </div>
  );
}
