import { AdminSupport } from "@/components/admin-support";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <AdminSupport user={user}/>;
}
