import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import s from "@/components/auth.module.css";
export default function SignUpPage(){return <main className={s.shell}><section className={s.card}><Logo/><h1>Create your account</h1><p className={s.intro}>Start distributing music with an account built for artists and labels.</p><AuthForm mode="signup"/></section></main>}
