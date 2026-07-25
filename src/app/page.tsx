import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";

export default async function Home() {
  const admin = await getAdminUser();
  redirect(admin ? "/dashboard" : "/login");
}
