import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

// The dashboard is auth-gated and reads request state (cookies) + env at request
// time. Force dynamic rendering for the entire /dashboard subtree so nothing here
// is prerendered at build (which would run before env vars exist).
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/connection", label: "Connection" },
  { href: "/dashboard/automations", label: "Automations" },
  { href: "/dashboard/posts", label: "Posts" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/queue", label: "Queue" },
  { href: "/dashboard/diagnostics", label: "Diagnostics" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Manyjean</span>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
              private
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{admin.email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg border border-border px-3 py-1.5 hover:bg-background">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4">
          <ul className="flex flex-wrap gap-1 -mb-px">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
