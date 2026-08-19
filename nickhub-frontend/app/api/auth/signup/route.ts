import { authenticate } from "@/lib/auth-route";
export async function POST(request: Request) { return authenticate(request, "signup"); }
