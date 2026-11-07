/**
 * What an automation sends first, and when its link goes out.
 *
 * A comment and a DM keyword start the same way: the welcome with its
 * quick-reply button. The link only follows the tap, which also runs the
 * follow gate. Before this, a DM keyword got the welcome as plain text (no
 * button, although the copy says "tap below"), then the link about a minute
 * later, without the follow check.
 */

export const QUICK_REPLY_PREFIX = "auto:"; // payload marker linking a reply to its automation
export const FOLLOW_REPLY_PREFIX = "follow:";
export const LINK_DELAY_SECONDS = 3; // small gap so a welcome sent in the same sequence lands first

type WelcomeFields = {
  id: string;
  welcome_message: string | null;
  quick_reply_text: string | null;
};

export type ButtonWelcomePayload = {
  recipient_id: string;
  text: string;
  quick_reply_title: string;
  quick_reply_payload: string;
};

/**
 * The welcome-with-button job payload for a DM keyword, or null when the
 * automation has no welcome or no button title (then the old sequence applies:
 * welcome as text, then the link).
 */
export function dmWelcomeWithButton(
  a: WelcomeFields,
  recipientId: string,
): ButtonWelcomePayload | null {
  const text = a.welcome_message?.trim();
  const title = a.quick_reply_text?.trim();
  if (!text || !title) return null;
  return {
    recipient_id: recipientId,
    text,
    quick_reply_title: title,
    quick_reply_payload: `${QUICK_REPLY_PREFIX}${a.id}`,
  };
}

/**
 * Seconds to hold the link. The gap only orders a welcome queued in the same
 * sequence; after a button tap nothing precedes the link, so it goes at once
 * and the drain that runs right after the webhook sends it.
 */
export function linkDelaySeconds(welcomeQueued: boolean): number {
  return welcomeQueued ? LINK_DELAY_SECONDS : 0;
}
