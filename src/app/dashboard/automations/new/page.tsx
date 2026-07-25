import { requireAdmin } from "@/lib/auth";
import { listAccounts } from "@/lib/repos/accounts";
import { PageHeader } from "@/components/ui";
import { AutomationForm } from "../AutomationForm";

export default async function NewAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string }>;
}) {
  await requireAdmin();
  const accounts = await listAccounts();
  const sp = await searchParams;

  return (
    <div>
      <PageHeader title="New automation" subtitle="Create a keyword automation." />
      <AutomationForm
        accounts={accounts.map((a) => ({
          id: a.id,
          label: `@${a.instagram_username ?? a.instagram_user_id}`,
        }))}
        defaultMediaId={sp.media}
      />
    </div>
  );
}
