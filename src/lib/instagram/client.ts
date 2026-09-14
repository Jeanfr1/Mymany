import "server-only";
import {
  IG_GRAPH_HOST,
  IG_GRAPH_BASE,
  IG_TOKEN_HOST,
} from "./config";
import { IgApiError, type GraphErrorBody } from "./errors";

/** Parse a fetch Response, throwing a classified IgApiError on failure. */
async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new IgApiError(res.status, text);
    return {} as T;
  }
  if (!res.ok) {
    throw new IgApiError(res.status, json as GraphErrorBody);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// OAuth token operations
// ---------------------------------------------------------------------------

export type ShortLivedToken = {
  access_token: string;
  user_id: string | number;
  permissions?: string[] | string;
};

export async function exchangeCodeForToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<ShortLivedToken> {
  const body = new URLSearchParams({
    client_id: params.appId,
    client_secret: params.appSecret,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
    code: params.code,
  });
  const res = await fetch(`${IG_TOKEN_HOST}/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return parse<ShortLivedToken>(res);
}

export type LongLivedToken = {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
};

export async function exchangeForLongLivedToken(params: {
  appSecret: string;
  shortLivedToken: string;
}): Promise<LongLivedToken> {
  const body = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: params.appSecret,
    access_token: params.shortLivedToken,
  });
  return parse<LongLivedToken>(
    await fetch(`${IG_GRAPH_HOST}/access_token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
}

export async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<LongLivedToken> {
  const url = new URL(`${IG_GRAPH_HOST}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);
  return parse<LongLivedToken>(await fetch(url, { method: "GET" }));
}

// ---------------------------------------------------------------------------
// Profile & media
// ---------------------------------------------------------------------------

export type IgProfile = {
  user_id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
};

export async function getProfile(accessToken: string): Promise<IgProfile> {
  const url = new URL(`${IG_GRAPH_BASE}/me`);
  url.searchParams.set(
    "fields",
    "user_id,username,name,profile_picture_url,account_type",
  );
  url.searchParams.set("access_token", accessToken);
  const raw = await parse<Record<string, unknown>>(
    await fetch(url, { method: "GET" }),
  );
  return {
    user_id: String(raw.user_id ?? raw.id ?? ""),
    username: raw.username as string | undefined,
    name: raw.name as string | undefined,
    profile_picture_url: raw.profile_picture_url as string | undefined,
    account_type: raw.account_type as string | undefined,
  };
}

export type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export type MediaPage = {
  data: IgMedia[];
  nextCursor?: string;
};

export async function getMedia(params: {
  accessToken: string;
  limit?: number;
  after?: string;
}): Promise<MediaPage> {
  const url = new URL(`${IG_GRAPH_BASE}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
  );
  url.searchParams.set("limit", String(params.limit ?? 24));
  if (params.after) url.searchParams.set("after", params.after);
  url.searchParams.set("access_token", params.accessToken);
  const raw = await parse<{
    data?: IgMedia[];
    paging?: { cursors?: { after?: string }; next?: string };
  }>(await fetch(url, { method: "GET" }));
  return {
    data: raw.data ?? [],
    nextCursor: raw.paging?.next ? raw.paging?.cursors?.after : undefined,
  };
}

// ---------------------------------------------------------------------------
// Messaging (DMs, private replies) & comments
// ---------------------------------------------------------------------------

export type QuickReply = { title: string; payload: string };

export type SendResult = { recipient_id?: string; message_id?: string };

type MessageObject = {
  text?: string;
  quick_replies?: Array<{
    content_type: "text";
    title: string;
    payload: string;
  }>;
};

function buildMessage(text: string, quickReplies?: QuickReply[]): MessageObject {
  const message: MessageObject = { text };
  if (quickReplies && quickReplies.length > 0) {
    message.quick_replies = quickReplies.map((q) => ({
      content_type: "text",
      title: q.title,
      payload: q.payload,
    }));
  }
  return message;
}

/** Send a standard DM to a user (requires an open messaging window). */
export async function sendMessage(params: {
  accessToken: string;
  igUserId: string;
  recipientId: string;
  text: string;
  quickReplies?: QuickReply[];
}): Promise<SendResult> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.igUserId}/messages`);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: { id: params.recipientId },
      message: buildMessage(params.text, params.quickReplies),
    }),
  });
  return parse<SendResult>(res);
}

export type UrlButton = { title: string; url: string };

/**
 * Send a DM containing a button template: real tappable web_url buttons
 * (Instagram Send API). Up to 3 buttons; titles are capped at 20 chars and
 * text at 640 by the platform, so we defensively slice. Requires an open
 * messaging window (recipient by id).
 */
export async function sendButtons(params: {
  accessToken: string;
  igUserId: string;
  recipientId: string;
  text: string;
  buttons: UrlButton[];
}): Promise<SendResult> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.igUserId}/messages`);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: { id: params.recipientId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: params.text.slice(0, 640),
            buttons: params.buttons.slice(0, 3).map((b) => ({
              type: "web_url",
              url: b.url,
              title: b.title.slice(0, 20),
            })),
          },
        },
      },
    }),
  });
  return parse<SendResult>(res);
}

/**
 * Private reply to a comment (does NOT open a messaging window; one per comment).
 * recipient is the comment_id (DECISIONS §5/§6).
 */
export async function sendPrivateReply(params: {
  accessToken: string;
  igUserId: string;
  commentId: string;
  text: string;
  quickReplies?: QuickReply[];
}): Promise<SendResult> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.igUserId}/messages`);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: { comment_id: params.commentId },
      message: buildMessage(params.text, params.quickReplies),
    }),
  });
  return parse<SendResult>(res);
}

/** Public reply under a comment. */
export async function publicReplyToComment(params: {
  accessToken: string;
  commentId: string;
  text: string;
}): Promise<{ id?: string }> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.commentId}/replies`);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: params.text }),
  });
  return parse<{ id?: string }>(res);
}

// ---------------------------------------------------------------------------
// Webhook subscription for the connected account
// ---------------------------------------------------------------------------

export async function subscribeAppToAccount(params: {
  accessToken: string;
  igUserId: string;
  fields: readonly string[];
}): Promise<{ success?: boolean }> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.igUserId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", params.fields.join(","));
  url.searchParams.set("access_token", params.accessToken);
  return parse<{ success?: boolean }>(await fetch(url, { method: "POST" }));
}

export async function getSubscribedApps(params: {
  accessToken: string;
  igUserId: string;
}): Promise<{ data?: Array<Record<string, unknown>> }> {
  const url = new URL(`${IG_GRAPH_BASE}/${params.igUserId}/subscribed_apps`);
  url.searchParams.set("access_token", params.accessToken);
  return parse<{ data?: Array<Record<string, unknown>> }>(
    await fetch(url, { method: "GET" }),
  );
}
