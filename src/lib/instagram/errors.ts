/**
 * Graph API error handling with transient-vs-permanent classification.
 * Used by the worker to decide whether to retry (DECISIONS §7 / brief §12).
 */

export type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

// Error codes that indicate a temporary condition worth retrying.
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);
// Codes that indicate an invalid/expired token — the account must reconnect.
const AUTH_CODES = new Set([190, 102, 10, 200]);

export class IgApiError extends Error {
  readonly httpStatus: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly type?: string;
  readonly fbtraceId?: string;
  readonly retryable: boolean;
  readonly isAuthError: boolean;

  constructor(httpStatus: number, body: GraphErrorBody | string | undefined) {
    const err = typeof body === "object" ? body?.error : undefined;
    super(err?.message || `Instagram API error (HTTP ${httpStatus})`);
    this.name = "IgApiError";
    this.httpStatus = httpStatus;
    this.code = err?.code;
    this.subcode = err?.error_subcode;
    this.type = err?.type;
    this.fbtraceId = err?.fbtrace_id;

    const rateLimited = httpStatus === 429;
    const serverError = httpStatus >= 500 && httpStatus < 600;
    const retryableCode = this.code !== undefined && RETRYABLE_CODES.has(this.code);
    this.isAuthError = this.code !== undefined && AUTH_CODES.has(this.code);

    // Auth errors are NOT retryable (need reconnect). Rate-limit / 5xx / transient codes are.
    this.retryable =
      !this.isAuthError && (rateLimited || serverError || retryableCode);
  }

  /** Safe object for structured logs (no secrets). */
  toLogFields() {
    return {
      http_status: this.httpStatus,
      meta_error_code: this.code,
      meta_error_subcode: this.subcode,
      meta_error_type: this.type,
      fbtrace_id: this.fbtraceId,
      retryable: this.retryable,
      is_auth_error: this.isAuthError,
    };
  }
}
