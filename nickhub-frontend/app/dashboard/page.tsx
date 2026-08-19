import { Dashboard } from "@/components/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function DashboardPage(){const user=await getCurrentUser();if(!user)redirect("/auth/sign-in");return <Dashboard user={user}/>}
