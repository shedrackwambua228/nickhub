import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import s from "@/components/auth.module.css";
export default function SignInPage(){return <main className={s.shell}><section className={s.card}><Logo/><h1>Welcome back</h1><p className={s.intro}>Sign in to manage your releases, royalties, and account.</p><AuthForm mode="login"/></section></main>}
