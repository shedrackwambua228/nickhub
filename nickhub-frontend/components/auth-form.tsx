"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import s from "./auth.module.css";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (signup && payload.password !== payload.confirmPassword) { setError("Passwords do not match"); setPending(false); return; }
    delete payload.confirmPassword;
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Authentication failed");
      router.push("/dashboard"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); setPending(false); }
  }
  return <form className={s.form} onSubmit={submit}>
    {signup && <><div className={s.row}><Field label="First name" name="firstName" autoComplete="given-name"/><Field label="Last name" name="lastName" autoComplete="family-name"/></div><Field label="Artist or label name" name="displayName" autoComplete="organization" required/><label>Account type<select name="role" defaultValue="artist"><option value="artist">Artist</option><option value="label">Label</option></select></label><Field label="Country" name="country" autoComplete="country-name"/></>}
    <Field label="Email address" name="email" type="email" autoComplete="email" required/>
    <Field label="Password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} required/>
    {signup && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required/>}
    {error && <p className={s.error} role="alert">{error}</p>}
    <button className="button buttonPrimary" disabled={pending} type="submit">{pending ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
    <p className={s.switch}>{signup ? "Already have an account?" : "New to NickHub?"} <Link href={signup ? "/auth/sign-in" : "/auth/sign-up"}>{signup ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };
function Field({ label, ...props }: FieldProps) { return <label>{label}<input {...props}/></label>; }
