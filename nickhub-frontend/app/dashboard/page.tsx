import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import s from "@/components/auth.module.css";
export default async function DashboardPage(){const user=await getCurrentUser();if(!user)redirect("/auth/sign-in");return <main className={`container ${s.dashboard}`}><section className={s.dashboardCard}><h1>Welcome, {user.displayName}</h1><p>Your NickHub account is connected. Release management can now be built on this protected area.</p><div className={s.details}><div><small>Email</small><strong>{user.email}</strong></div><div><small>Account</small><strong>{user.role}</strong></div><div><small>Subscription</small><strong>{user.subscriptionStatus}</strong></div><div><small>Country</small><strong>{user.country||"Not set"}</strong></div></div><LogoutButton/></section></main>}
