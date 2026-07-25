"use client";

import { useState, useTransition } from "react";
import { runDiagnosticsAction } from "./actions";

type Report = Awaited<ReturnType<typeof runDiagnosticsAction>>;

export function DiagnosticsButton() {
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        setReport(await runDiagnosticsAction());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Diagnostics failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-60"
      >
        {pending ? "Running…" : "Run connection test"}
      </button>
      <p className="text-xs text-muted">
        Read-only. Verifies token validity and webhook subscription. Never sends
        a message to anyone.
      </p>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          <div className="text-sm">
            Database:{" "}
            <span className={report.dbOk ? "text-success" : "text-danger"}>
              {report.dbOk ? "OK" : "unreachable"}
            </span>
          </div>
          {report.accounts.length === 0 && (
            <div className="text-sm text-muted">No accounts connected.</div>
          )}
          {report.accounts.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <div className="font-medium">@{a.username ?? a.id}</div>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  Token valid:{" "}
                  <span className={a.tokenValid ? "text-success" : "text-danger"}>
                    {a.tokenValid ? "yes" : "no"}
                  </span>
                  {a.profileError && (
                    <span className="text-danger"> — {a.profileError}</span>
                  )}
                </li>
                <li>
                  Webhook subscribed:{" "}
                  <span
                    className={
                      a.webhookSubscribed ? "text-success" : "text-warning"
                    }
                  >
                    {a.webhookSubscribed ? "yes" : "no"}
                  </span>
                  {a.subscribedFields.length > 0 && (
                    <span className="text-muted">
                      {" "}
                      ({a.subscribedFields.join(", ")})
                    </span>
                  )}
                  {a.subscriptionError && (
                    <span className="text-danger"> — {a.subscriptionError}</span>
                  )}
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
