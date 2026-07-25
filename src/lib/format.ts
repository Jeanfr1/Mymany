const TZ = "America/Sao_Paulo";

/** Format a UTC ISO timestamp for display in America/Sao_Paulo (brief §13). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** True if the given timestamp is within `days` of now (or already past). */
export function isExpiringSoon(
  iso: string | null | undefined,
  days = 10,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t - Date.now() < days * 24 * 60 * 60 * 1000;
}

/** Relative "time ago" for compact display. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
