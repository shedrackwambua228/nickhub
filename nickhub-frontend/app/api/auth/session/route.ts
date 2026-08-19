import { NextResponse } from "next/server";
import { AUTH_COOKIE, getCurrentUser } from "@/lib/auth";
export async function GET() {
  const user = await getCurrentUser();
  const response = NextResponse.json({ user }, { status: user ? 200 : 401 });
  if (!user) response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
