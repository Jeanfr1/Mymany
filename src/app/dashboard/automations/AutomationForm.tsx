"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAutomation } from "./actions";
import type { Tables } from "@/types/database.types";

type AccountOption = { id: string; label: string };

function splitList(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const field =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const labelCls = "block text-sm font-medium";
const help = "mt-1 text-xs text-muted";

export function AutomationForm({
  accounts,
  initial,
  defaultMediaId,
}: {
  accounts: AccountOption[];
  initial?: Tables<"automations">;
  defaultMediaId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    instagram_account_id: initial?.instagram_account_id ?? accounts[0]?.id ?? "",
    name: initial?.name ?? "",
    active: initial?.active ?? false,
    trigger_comment: initial?.trigger_comment ?? true,
    trigger_story_reply: initial?.trigger_story_reply ?? false,
    trigger_direct_message: initial?.trigger_direct_message ?? false,
    keywords: (initial?.keywords ?? []).join(", "),
    match_type: (initial?.match_type ?? "contains") as
      | "contains"
      | "exact"
      | "any",
    remove_accents: initial?.remove_accents ?? false,
    specific_media_id: initial?.specific_media_id ?? defaultMediaId ?? "",
    public_reply_enabled: initial?.public_reply_enabled ?? false,
    public_reply_variations: (initial?.public_reply_variations ?? []).join("\n"),
    welcome_message: initial?.welcome_message ?? "",
    quick_reply_text: initial?.quick_reply_text ?? "Send me the link",
    link_message: initial?.link_message ?? "",
    link_button_label: initial?.link_button_label ?? "",
    link_url: initial?.link_url ?? "",
    click_tracking_enabled: initial?.click_tracking_enabled ?? true,
    reminder_enabled: initial?.reminder_enabled ?? false,
    reminder_text: initial?.reminder_text ?? "",
    reminder_delay_seconds: initial?.reminder_delay_seconds ?? 3600,
    cancel_reminder_after_click: initial?.cancel_reminder_after_click ?? true,
  });

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...(initial ? { id: initial.id } : {}),
      instagram_account_id: f.instagram_account_id,
      name: f.name,
      active: f.active,
      trigger_comment: f.trigger_comment,
      trigger_story_reply: f.trigger_story_reply,
      trigger_direct_message: f.trigger_direct_message,
      keywords: splitList(f.keywords),
      match_type: f.match_type,
      remove_accents: f.remove_accents,
      specific_media_id: f.specific_media_id || null,
      public_reply_enabled: f.public_reply_enabled,
      public_reply_variations: splitList(f.public_reply_variations),
      welcome_message: f.welcome_message || null,
      quick_reply_text: f.quick_reply_text || null,
      link_message: f.link_message || null,
      link_button_label: f.link_button_label || null,
      link_url: f.link_url || null,
      click_tracking_enabled: f.click_tracking_enabled,
      reminder_enabled: f.reminder_enabled,
      reminder_text: f.reminder_text || null,
      reminder_delay_seconds: Number(f.reminder_delay_seconds) || 0,
      cancel_reminder_after_click: f.cancel_reminder_after_click,
    };

    startTransition(async () => {
      const res = await saveAutomation(payload);
      if (res && !res.ok) setError(res.error);
      else router.push("/dashboard/automations");
    });
  }

  const check = (key: keyof typeof f, label: string, hint?: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(f[key])}
        onChange={(e) => set(key, e.target.checked as never)}
        className="mt-0.5"
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {accounts.length === 0 && (
        <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          Connect an Instagram account first (Connection tab).
        </div>
      )}

      {/* Basics */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Basics</h2>
        <div>
          <label className={labelCls}>Account</label>
          <select
            className={field}
            value={f.instagram_account_id}
            onChange={(e) => set("instagram_account_id", e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input
            className={field}
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Ebook keyword funnel"
          />
        </div>
        {check("active", "Active", "Turn the automation on/off.")}
      </section>

      {/* Triggers */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Triggers</h2>
        <div className="space-y-2">
          {check("trigger_comment", "Comment on a post/Reel")}
          {check("trigger_story_reply", "Reply to a Story")}
          {check("trigger_direct_message", "Direct message")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Keywords (comma or newline)</label>
            <input
              className={field}
              value={f.keywords}
              onChange={(e) => set("keywords", e.target.value)}
              placeholder="link, guia, quero"
            />
            <p className={help}>Ignored when match type is “any”.</p>
          </div>
          <div>
            <label className={labelCls}>Match type</label>
            <select
              className={field}
              value={f.match_type}
              onChange={(e) =>
                set("match_type", e.target.value as typeof f.match_type)
              }
            >
              <option value="contains">contains</option>
              <option value="exact">exact</option>
              <option value="any">any (no keyword)</option>
            </select>
          </div>
        </div>
        {check("remove_accents", "Ignore accents when matching")}
        <div>
          <label className={labelCls}>Specific post/Reel media ID (optional)</label>
          <input
            className={field}
            value={f.specific_media_id}
            onChange={(e) => set("specific_media_id", e.target.value)}
            placeholder="Leave empty to apply to all posts"
          />
          <p className={help}>
            Pick a post in the Posts tab to fill this automatically.
          </p>
        </div>
      </section>

      {/* Comment replies */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Comment replies</h2>
        <div>
          <label className={labelCls}>
            Private reply (invites them to respond)
          </label>
          <textarea
            className={field}
            rows={2}
            value={f.welcome_message}
            onChange={(e) => set("welcome_message", e.target.value)}
            placeholder="Hey! Want the link? Tap the button below 👇"
          />
        </div>
        <div>
          <label className={labelCls}>Quick reply button text</label>
          <input
            className={field}
            value={f.quick_reply_text}
            onChange={(e) => set("quick_reply_text", e.target.value)}
            placeholder="Send me the link"
          />
          <p className={help}>
            Tapping this generates an inbound message that opens the 24h window.
          </p>
        </div>
        {check(
          "public_reply_enabled",
          "Also post a public reply under the comment",
        )}
        {f.public_reply_enabled && (
          <div>
            <label className={labelCls}>
              Public reply variations (one per line)
            </label>
            <textarea
              className={field}
              rows={3}
              value={f.public_reply_variations}
              onChange={(e) => set("public_reply_variations", e.target.value)}
              placeholder={"Check your DMs! 💌\nSent you a message 🚀"}
            />
          </div>
        )}
      </section>

      {/* Link + reminder */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Link &amp; reminder</h2>
        <div>
          <label className={labelCls}>Link message</label>
          <textarea
            className={field}
            rows={2}
            value={f.link_message}
            onChange={(e) => set("link_message", e.target.value)}
            placeholder="Here's your link:"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Button label</label>
            <input
              className={field}
              value={f.link_button_label}
              onChange={(e) => set("link_button_label", e.target.value)}
              placeholder="Get it here"
            />
          </div>
          <div>
            <label className={labelCls}>Link URL (https only)</label>
            <input
              className={field}
              value={f.link_url}
              onChange={(e) => set("link_url", e.target.value)}
              placeholder="https://your-site.com/offer"
            />
          </div>
        </div>
        {check(
          "click_tracking_enabled",
          "Track clicks with a redirect link",
          "Records clicks on links this app sends (disclosed in privacy policy).",
        )}
        {check("reminder_enabled", "Send a reminder if they don't click")}
        {f.reminder_enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Reminder message</label>
              <textarea
                className={field}
                rows={2}
                value={f.reminder_text}
                onChange={(e) => set("reminder_text", e.target.value)}
                placeholder="Still interested? Here's the link again 👇"
              />
            </div>
            <div>
              <label className={labelCls}>Reminder delay (seconds)</label>
              <input
                type="number"
                min={0}
                max={86400}
                className={field}
                value={f.reminder_delay_seconds}
                onChange={(e) =>
                  set("reminder_delay_seconds", Number(e.target.value) as never)
                }
              />
              <p className={help}>Must be within the 24h window (≤ 86400).</p>
            </div>
            {check(
              "cancel_reminder_after_click",
              "Cancel reminder once they click",
            )}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || accounts.length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save automation"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/automations")}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
