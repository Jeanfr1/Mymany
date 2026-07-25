import { requireAdmin } from "@/lib/auth";
import { envPresence } from "@/lib/diagnostics";
import { PageHeader, Card } from "@/components/ui";
import { IG_API_VERSION, IG_SCOPE_STRING } from "@/lib/instagram/config";
import { DiagnosticsButton } from "./DiagnosticsButton";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  await requireAdmin();
  const env = envPresence();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostics"
        subtitle="Configuration and live connection checks."
      />

      <Card>
        <h2 className="font-semibold">Environment</h2>
        <p className="mb-3 text-xs text-muted">
          Presence only — secret values are never shown.
        </p>
        <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {env.map((e) => (
            <li key={e.name} className="flex items-center gap-2">
              <span className={e.present ? "text-success" : "text-danger"}>
                {e.present ? "✓" : "✗"}
              </span>
              <span className="font-mono text-xs">{e.name}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">Platform</h2>
        <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted">API version</dt>
            <dd className="font-mono">{IG_API_VERSION}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Scopes</dt>
            <dd className="font-mono text-xs">{IG_SCOPE_STRING}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Live connection test</h2>
        <DiagnosticsButton />
      </Card>
    </div>
  );
}
