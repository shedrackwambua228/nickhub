import "server-only";
import { NextResponse } from "next/server";
import { API_URL, AUTH_COOKIE, type User } from "./auth";

type AuthResponse = { token?: string; user?: User; error?: string };

export async function authenticate(request: Request, endpoint: "login" | "signup") {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  try {
    const upstream = await fetch(`${API_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await upstream.json()) as AuthResponse;
    if (!upstream.ok || !data.token || !data.user) {
      return NextResponse.json({ error: data.error ?? "Authentication failed" }, { status: upstream.status });
    }
    const response = NextResponse.json({ user: data.user }, { status: endpoint === "signup" ? 201 : 200 });
    response.cookies.set(AUTH_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 });
  }
}
