import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, AUTH_COOKIE } from "./auth";

export async function billingRequest(path: string, body?: unknown) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  try {
    const upstream = await fetch(`${API_URL}/api/billing/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Billing service is unavailable" }, { status: 503 });
  }
}
