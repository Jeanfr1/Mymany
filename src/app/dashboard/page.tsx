import { requireAdmin } from "@/lib/auth";

export default async function OverviewPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted">
          Health and activity for your connected Instagram accounts.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        Dashboard widgets are wired up in a later step. Use the tabs above to
        connect an account and create automations.
      </div>
    </div>
  );
}
