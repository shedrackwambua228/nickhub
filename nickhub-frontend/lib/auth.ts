import "server-only";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "nickhub_session";
export const API_URL = process.env.NICKHUB_API_URL ?? "http://localhost:4000";

export type User = {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  role: "ARTIST" | "LABEL" | "ADMIN";
  country?: string | null;
  subscriptionStatus: "NONE" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
};

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: User };
    return data.user;
  } catch {
    return null;
  }
}
