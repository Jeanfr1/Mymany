"use server";

import { requireAdmin } from "@/lib/auth";
import { runLiveDiagnostics } from "@/lib/diagnostics";

export async function runDiagnosticsAction() {
  await requireAdmin();
  return runLiveDiagnostics();
}
