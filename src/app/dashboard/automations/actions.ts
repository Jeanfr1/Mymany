"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { automationInputSchema } from "@/lib/validation/automation";
import {
  createAutomation,
  updateAutomation,
  setAutomationActive,
  deleteAutomation,
} from "@/lib/repos/automations";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveAutomation(raw: unknown): Promise<SaveResult> {
  await requireAdmin();

  const parsed = automationInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `${first.path.join(".") || "form"}: ${first.message}`,
    };
  }

  const { id, ...fields } = parsed.data;
  const record = {
    ...fields,
    specific_media_id: fields.specific_media_id || null,
    welcome_message: fields.welcome_message || null,
    quick_reply_text: fields.quick_reply_text || null,
    link_message: fields.link_message || null,
    link_button_label: fields.link_button_label || null,
    link_url: fields.link_url || null,
    reminder_text: fields.reminder_text || null,
  };

  if (id) {
    await updateAutomation(id, record);
  } else {
    await createAutomation(record);
  }

  revalidatePath("/dashboard/automations");
  redirect("/dashboard/automations");
}

export async function toggleAutomationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  await setAutomationActive(id, active);
  revalidatePath("/dashboard/automations");
}

export async function deleteAutomationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteAutomation(id);
  revalidatePath("/dashboard/automations");
  redirect("/dashboard/automations");
}
