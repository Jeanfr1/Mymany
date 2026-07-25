import { z } from "zod";
import { isSafeHttpsUrl } from "@/lib/url";

const optionalHttps = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .refine((v) => !v || isSafeHttpsUrl(v), {
    message: "Must be a valid https:// URL",
  });

const textList = z
  .array(z.string().trim().min(1).max(500))
  .max(50)
  .default([]);

export const automationInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    instagram_account_id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    active: z.boolean().default(false),

    trigger_comment: z.boolean().default(false),
    trigger_story_reply: z.boolean().default(false),
    trigger_direct_message: z.boolean().default(false),

    keywords: textList,
    match_type: z.enum(["contains", "exact", "any"]).default("contains"),
    remove_accents: z.boolean().default(false),
    specific_media_id: z.string().trim().max(100).nullable().optional(),

    public_reply_enabled: z.boolean().default(false),
    public_reply_variations: textList,

    welcome_message: z.string().trim().max(1000).nullable().optional(),
    quick_reply_text: z.string().trim().max(20).nullable().optional(),

    link_message: z.string().trim().max(1000).nullable().optional(),
    link_button_label: z.string().trim().max(60).nullable().optional(),
    link_url: optionalHttps,
    click_tracking_enabled: z.boolean().default(true),

    reminder_enabled: z.boolean().default(false),
    reminder_text: z.string().trim().max(1000).nullable().optional(),
    reminder_delay_seconds: z.number().int().min(0).max(86400).default(3600),
    cancel_reminder_after_click: z.boolean().default(true),
  })
  .refine(
    (v) => v.trigger_comment || v.trigger_story_reply || v.trigger_direct_message,
    { message: "Select at least one trigger", path: ["trigger_comment"] },
  )
  .refine((v) => v.match_type === "any" || v.keywords.length > 0, {
    message: "Add at least one keyword (or use match type 'any')",
    path: ["keywords"],
  });

export type AutomationInput = z.infer<typeof automationInputSchema>;
