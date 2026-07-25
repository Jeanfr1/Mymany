"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { reprocessJob } from "@/lib/repos/dashboard";

export async function reprocessJobAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await reprocessJob(id);
  revalidatePath("/dashboard/queue");
}
