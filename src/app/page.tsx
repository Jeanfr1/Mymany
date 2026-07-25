import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const admin = await getAdminUser();
  redirect(admin ? "/dashboard" : "/login");
}
