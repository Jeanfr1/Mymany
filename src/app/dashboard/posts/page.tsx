import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAccounts, getAccountToken } from "@/lib/repos/accounts";
import { getMedia } from "@/lib/instagram/client";
import { PageHeader, EmptyState, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  await requireAdmin();
  const accounts = await listAccounts();
  const connected = accounts.filter(
    (a) => a.connection_status === "connected" && a.access_token_enc,
  );
  const sp = await searchParams;
  const selected =
    connected.find((a) => a.id === sp.account) ?? connected[0] ?? null;

  let media: Awaited<ReturnType<typeof getMedia>>["data"] = [];
  let loadError: string | null = null;

  if (selected) {
    try {
      const token = await getAccountToken(selected.id);
      if (token) {
        const page = await getMedia({ accessToken: token, limit: 24 });
        media = page.data;
      }
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Failed to load media.";
    }
  }

  return (
    <div>
      <PageHeader
        title="Posts"
        subtitle="Pick a post to scope an automation to a specific post or Reel."
      />

      {connected.length === 0 ? (
        <EmptyState>Connect an account to browse your posts.</EmptyState>
      ) : (
        <>
          {connected.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {connected.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/posts?account=${a.id}`}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    selected?.id === a.id
                      ? "border-brand text-brand"
                      : "border-border text-muted"
                  }`}
                >
                  @{a.instagram_username ?? a.instagram_user_id}
                </Link>
              ))}
            </div>
          )}

          {loadError && (
            <div className="mb-4 rounded-lg bg-warning/10 p-3 text-sm text-warning">
              Could not load media: {loadError}
            </div>
          )}

          {media.length === 0 && !loadError ? (
            <EmptyState>No media found for this account.</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.map((m) => {
                const thumb = m.thumbnail_url ?? m.media_url;
                return (
                  <Card key={m.id} className="p-3">
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted/10">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">
                          {m.media_type ?? "media"}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-muted">
                      {m.caption ?? "(no caption)"}
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-muted">
                      {m.id}
                    </div>
                    <Link
                      href={`/dashboard/automations/new?media=${m.id}`}
                      className="mt-2 inline-block rounded-lg border border-border px-2 py-1 text-xs hover:bg-background"
                    >
                      Automate this post
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
