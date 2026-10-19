/**
 * Follow-gate copy. An automation whose name starts with FOLLOW_GATE_NAME_PREFIX
 * only delivers its link to people who follow the account; everyone else gets
 * the gate message with a quick-reply button to re-check.
 *
 * The copy is per automation (follow_gate_* columns). When an automation leaves
 * them empty, the original Portuguese defaults apply, so older automations keep
 * sending exactly what they sent before.
 */

export const FOLLOW_GATE_NAME_PREFIX = "[FOLLOW]";
export const HANDLE_PLACEHOLDER = "{handle}";

export const FOLLOW_GATE_DEFAULTS = {
  message:
    "Para liberar o seu plano, siga {handle} e depois toque no botão abaixo. Vou verificar automaticamente.",
  retryMessage:
    "Ainda não consegui confirmar que você segue {handle}. Siga o perfil e toque novamente para liberar o PDF.",
  button: "Já estou seguindo",
  // Used only with the default copy; custom copy falls back to a neutral word.
  missingHandle: "este perfil",
} as const;

const CUSTOM_MISSING_HANDLE = "this account";

export type FollowGateCopySource = {
  follow_gate_message?: string | null;
  follow_gate_retry_message?: string | null;
  follow_gate_button?: string | null;
};

export function isFollowGated(name: string): boolean {
  return name.startsWith(FOLLOW_GATE_NAME_PREFIX);
}

function clean(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Resolve the gate text and button for one send.
 *  - first ask: follow_gate_message, else the default message
 *  - retry: follow_gate_retry_message, else follow_gate_message (same language
 *    as the first ask), else the default retry message
 *  - button: follow_gate_button, else the default button
 * `{handle}` becomes `@username` (or a neutral fallback when unknown).
 */
export function renderFollowGate(
  automation: FollowGateCopySource,
  username: string | null,
  isRetry: boolean = false,
): { text: string; button: string } {
  const message = clean(automation.follow_gate_message);
  const retry = clean(automation.follow_gate_retry_message);
  const button = clean(automation.follow_gate_button);

  const custom = isRetry ? (retry ?? message) : message;
  const template =
    custom ??
    (isRetry ? FOLLOW_GATE_DEFAULTS.retryMessage : FOLLOW_GATE_DEFAULTS.message);
  const handle = username
    ? `@${username}`
    : custom
      ? CUSTOM_MISSING_HANDLE
      : FOLLOW_GATE_DEFAULTS.missingHandle;

  return {
    text: template.split(HANDLE_PLACEHOLDER).join(handle),
    button: button ?? FOLLOW_GATE_DEFAULTS.button,
  };
}
