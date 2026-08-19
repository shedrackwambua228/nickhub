"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import s from "./billing.module.css";

export function BillingSuccess({ reference }: { reference: string }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "success" | "error">(reference ? "checking" : "error");
  const [message, setMessage] = useState(reference ? "Confirming your subscription…" : "Paystack did not return a payment reference.");

  useEffect(() => {
    if (!reference) {
      return;
    }
    fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to confirm payment");
        setState("success");
        setMessage("Payment confirmed. Your distribution services are now unlocked.");
        router.refresh();
      })
      .catch((error) => {
        setState("error");
        setMessage(error.message);
      });
  }, [reference, router]);

  return <main className={s.shell}><section className={s.card}>
    <div className={`${s.mark} ${s[state]}`}>{state === "checking" ? "…" : state === "success" ? "✓" : "!"}</div>
    <h1>{state === "success" ? "You’re ready to release" : "Payment confirmation"}</h1>
    <p>{message}</p>
    {state === "success"
      ? <Link className="button buttonPrimary" href="/dashboard">Continue to dashboard</Link>
      : state === "error"
        ? <Link className="button buttonSecondary" href="/#pricing">Return to plans</Link>
        : null}
  </section></main>;
}
