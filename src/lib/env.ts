import { z } from "zod";

/**
 * Centralized, fail-fast environment validation (Zod).
 *
 * - `serverEnv` is validated lazily on first access on the server only.
 * - Public values (safe for the browser) use the NEXT_PUBLIC_ prefix.
 * - NEVER expose secrets with NEXT_PUBLIC_. Secrets are read here on the server only.
 *
 * See docs/DECISIONS.md §14/§15 for rationale.
 */

const serverSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .describe("Public base URL, e.g. https://manyjean.vercel.app"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20)
    .describe("Server-only. Never sent to the browser."),

  // Instagram / Meta
  INSTAGRAM_APP_ID: z.string().min(1),
  INSTAGRAM_APP_SECRET: z.string().min(1),
  INSTAGRAM_VERIFY_TOKEN: z
    .string()
    .min(16)
    .describe("Random token echoed back during the webhook GET handshake."),

  // Crypto & internal auth
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .describe("Base64-encoded 32-byte key for AES-256-GCM token encryption."),
  INTERNAL_CRON_SECRET: z
    .string()
    .min(16)
    .describe("Shared secret guarding internal cron endpoints."),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Validate and return server-side environment variables.
 * Throws a readable error listing every missing/invalid variable.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n` +
        `See .env.example and docs/DECISIONS.md §15.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Public config safe to reference in client components. */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
