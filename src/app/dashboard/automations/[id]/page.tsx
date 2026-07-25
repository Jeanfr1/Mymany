import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAutomation } from "@/lib/repos/automations";
import { listAccounts } from "@/lib/repos/accounts";
import { PageHeader } from "@/components/ui";
import { AutomationForm } from "../AutomationForm";
import { deleteAutomationAction } from "../actions";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [automation, accounts] = await Promise.all([
    getAutomation(id),
    listAccounts(),
  ]);
  if (!automation) notFound();

  return (
    <div>
      <PageHeader
        title="Edit automation"
        subtitle={automation.name}
        action={
          <form action={deleteAutomationAction}>
            <input type="hidden" name="id" value={automation.id} />
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-card">
              Delete
            </button>
          </form>
        }
      />
      <AutomationForm
        accounts={accounts.map((a) => ({
          id: a.id,
          label: `@${a.instagram_username ?? a.instagram_user_id}`,
        }))}
        initial={automation}
      />
    </div>
  );
}
