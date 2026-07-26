"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const inputCls =
    "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

  // Primary: email + password (no email delivery needed).
  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  // Fallback: magic link (subject to the email provider's rate limit).
  async function sendMagicLink() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Manyjean</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your admin dashboard.</p>

        {magicSent ? (
          <div className="mt-6 rounded-lg bg-success/10 p-4 text-sm text-success">
            Magic link sent to <b>{email}</b>. Open it on this device to finish
            signing in.
          </div>
        ) : (
          <form onSubmit={signInWithPassword} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={busy}
                className="text-xs text-muted underline hover:text-foreground"
              >
                or email me a magic link instead
              </button>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-muted">{info}</p>}
          </form>
        )}
        <p className="mt-6 text-xs text-muted">
          Only pre-authorized admin emails can access this app. Public sign-ups
          are disabled.
        </p>
      </div>
    </main>
  );
}
