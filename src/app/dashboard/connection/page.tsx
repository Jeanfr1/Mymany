import { requireAdmin } from "@/lib/auth";
import { listAccounts } from "@/lib/repos/accounts";
import { Card, Badge, PageHeader, EmptyState } from "@/components/ui";
import { formatDateTime, timeAgo, isExpiringSoon } from "@/lib/format";
import { disconnectAccountAction } from "./actions";

const STATUS_MESSAGES: Record<string, string> = {
  connected: "Account connected successfully.",
  denied: "You declined the Instagram permission request.",
  missing_code: "Instagram did not return an authorization code.",
  invalid_state: "The connection link expired or was already used. Try again.",
  no_profile: "Could not read the account profile.",
  account_not_authorized:
    "Instagram rejected this account. Add it as an Instagram Tester and accept the invitation, or grant the app Advanced Access.",
  error: "Something went wrong during connection. Check diagnostics.",
};

export default async function ConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subscribed?: string; username?: string }>;
}) {
  await requireAdmin();
  const accounts = await listAccounts();
  const sp = await searchParams;
  const banner = sp.status ? STATUS_MESSAGES[sp.status] : undefined;

  return (
    <div>
      <PageHeader
        title="Connection"
        subtitle="Connect and manage your own Instagram Business/Creator accounts."
        action={
          <a
            href="/api/oauth/start"
            className="inline-block rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg"
          >
            + Connect Instagram
          </a>
        }
      />

      {banner && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            sp.status === "connected"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {banner}
          {sp.status === "connected" && sp.subscribed === "0" && (
            <>
              {" "}
              Note: webhook subscription was not confirmed — re-check in
              Diagnostics.
            </>
          )}
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState>
          No accounts connected yet. Click <b>Connect Instagram</b> to link your
          first account. (You must finish the Meta app setup first — see the
          setup guide.)
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const expiring = isExpiringSoon(a.token_expires_at, 10);
            return (
              <Card key={a.id}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {a.profile_picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.profile_picture_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted/20" />
                    )}
                    <div>
                      <div className="font-medium">
                        @{a.instagram_username ?? a.instagram_user_id}
                      </div>
                      <div className="text-xs text-muted">
                        {a.instagram_name ?? "—"} · last webhook{" "}
                        {timeAgo(a.last_webhook_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={a.connection_status} />
                    <a
                      href={`/api/oauth/start?reconnect=${a.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                    >
                      Reconnect
                    </a>
                    <form action={disconnectAccountAction}>
                      <input type="hidden" name="accountId" value={a.id} />
                      <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-background">
                        Disconnect
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                  <div>
                    <div className="uppercase tracking-wide">Token expires</div>
                    <div className={expiring ? "text-warning" : ""}>
                      {formatDateTime(a.token_expires_at)}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide">Scopes</div>
                    <div>{a.scopes.length}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide">Last refresh</div>
                    <div>{timeAgo(a.last_token_refresh_at)}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide">IG ID</div>
                    <div className="truncate font-mono">{a.instagram_user_id}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
