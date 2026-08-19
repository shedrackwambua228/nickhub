import { billingRequest } from "@/lib/billing-route";
export async function POST(request: Request){return billingRequest("confirm-session",await request.json())}
