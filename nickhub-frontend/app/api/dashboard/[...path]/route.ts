import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, AUTH_COOKIE } from "@/lib/auth";

const ALLOWED = new Set(["releases", "royalties", "withdrawals", "support", "billing", "admin"]);

async function proxy(request: Request, context: RouteContext<"/api/dashboard/[...path]">) {
  const { path } = await context.params;
  if (!path.length || !ALLOWED.has(path[0]) || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    return NextResponse.json({ error: "Unsupported dashboard operation" }, { status: 404 });
  }
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  const url = new URL(request.url);
  const target = `${API_URL}/api/${path.join("/")}${url.search}`;
  try {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const upstream = await fetch(target, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" } });
  } catch {
    return NextResponse.json({ error: "Dashboard service is unavailable" }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
