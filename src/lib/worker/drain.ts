import "server-only";
import { randomBytes } from "node:crypto";
import {
  claimJobs,
  markJobSent,
  markJobSkipped,
  markJobFailed,
  rescheduleJob,
  type QueueJob,
} from "@/lib/repos/queue";
import { setConnectionStatus } from "@/lib/repos/accounts";
import { executeJob } from "./handlers";
import { computeBackoffMs } from "./backoff";
import { IgApiError } from "@/lib/instagram/errors";
import { log } from "@/lib/log";

/**
 * Operational settings (NOT official Meta limits — see DECISIONS §7/§12).
 * Conservative and adjustable. Surfaced as "internal" in the dashboard.
 */
export const WORKER_CONFIG = {
  batchSize: 10,
  perMessageDelayMs: 350, // ~3 msgs/sec pacing
  claimStuckAfterSeconds: 300,
  opportunisticBatchSize: 5,
};

export type DrainSummary = {
  claimed: number;
  sent: number;
  skipped: number;
  retried: number;
  failed: number;
};

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, Math.max(0, ms)));

export async function drainQueue(
  opts: { batchSize?: number; perMessageDelayMs?: number } = {},
): Promise<DrainSummary> {
  const batchSize = opts.batchSize ?? WORKER_CONFIG.batchSize;
  const delay = opts.perMessageDelayMs ?? WORKER_CONFIG.perMessageDelayMs;
  const workerId = `w_${randomBytes(4).toString("hex")}`;

  const summary: DrainSummary = {
    claimed: 0,
    sent: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
  };

  const jobs = await claimJobs({
    batchSize,
    workerId,
    stuckAfterSeconds: WORKER_CONFIG.claimStuckAfterSeconds,
  });
  summary.claimed = jobs.length;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    try {
      const outcome = await executeJob(job);
      if (outcome.type === "sent") {
        await markJobSent(job.id, outcome.providerMessageId);
        summary.sent++;
      } else {
        await markJobSkipped(job.id, outcome.reason);
        summary.skipped++;
      }
    } catch (err) {
      await handleFailure(job, err, summary);
    }
    if (delay > 0 && i < jobs.length - 1) await sleep(delay);
  }

  if (summary.claimed > 0) log.info("queue drained", { ...summary, workerId });
  return summary;
}

async function handleFailure(
  job: QueueJob,
  err: unknown,
  summary: DrainSummary,
): Promise<void> {
  const attemptsUsed = job.attempts; // already incremented by claim RPC
  const canRetry = attemptsUsed < job.max_attempts;

  if (err instanceof IgApiError) {
    // Invalid/expired token: mark the account, fail the job (needs reconnect).
    if (err.isAuthError) {
      if (job.instagram_account_id) {
        await setConnectionStatus(job.instagram_account_id, "expired");
      }
      await markJobFailed(job.id, `auth_error code=${err.code}`);
      summary.failed++;
      log.warn("job failed: auth error", { job_id: job.id, ...err.toLogFields() });
      return;
    }
    // Transient (429/5xx/temporary): retry with backoff, else fail.
    if (err.retryable && canRetry) {
      const backoff = computeBackoffMs(attemptsUsed + 1);
      await rescheduleJob({
        id: job.id,
        nextAttemptInMs: backoff,
        error: `retryable code=${err.code} http=${err.httpStatus}`,
      });
      summary.retried++;
      return;
    }
    // Permanent (bad param / policy) OR out of attempts.
    await markJobFailed(job.id, `permanent code=${err.code} http=${err.httpStatus}`);
    summary.failed++;
    return;
  }

  // Unknown/network error: treat as transient.
  const message = err instanceof Error ? err.message : String(err);
  if (canRetry) {
    await rescheduleJob({
      id: job.id,
      nextAttemptInMs: computeBackoffMs(attemptsUsed + 1),
      error: `transient: ${message}`,
    });
    summary.retried++;
  } else {
    await markJobFailed(job.id, `giving up: ${message}`);
    summary.failed++;
  }
}

/** Best-effort opportunistic drain after a webhook (cron is the durable path). */
export async function maybeDrainQueue(): Promise<void> {
  try {
    await drainQueue({
      batchSize: WORKER_CONFIG.opportunisticBatchSize,
      perMessageDelayMs: WORKER_CONFIG.perMessageDelayMs,
    });
  } catch (err) {
    log.warn("opportunistic drain failed (cron will recover)", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
