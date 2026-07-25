"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { disconnectAccount } from "@/lib/repos/accounts";

export async function disconnectAccountAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("accountId") ?? "");
  if (!id) return;
  await disconnectAccount(id);
  revalidatePath("/dashboard/connection");
}
