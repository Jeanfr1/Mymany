import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  connected: "bg-success/10 text-success",
  disconnected: "bg-muted/15 text-muted",
  expired: "bg-warning/10 text-warning",
  error: "bg-danger/10 text-danger",
  pending: "bg-warning/10 text-warning",
  sending: "bg-brand/10 text-brand",
  sent: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
  skipped: "bg-muted/15 text-muted",
  cancelled: "bg-muted/15 text-muted",
  active: "bg-success/10 text-success",
  inactive: "bg-muted/15 text-muted",
};

export function Badge({ status }: { status: string }) {
  const tone = BADGE_TONES[status] ?? "bg-muted/15 text-muted";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${tone}`}>
      {status}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const cls =
    variant === "primary"
      ? "bg-brand text-brand-fg"
      : "border border-border hover:bg-background";
  return (
    <Link
      href={href}
      className={`inline-block rounded-lg px-3 py-1.5 text-sm font-medium ${cls}`}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card className="text-center text-sm text-muted">{children}</Card>
  );
}
