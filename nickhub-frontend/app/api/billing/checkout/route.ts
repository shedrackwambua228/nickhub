import { billingRequest } from "@/lib/billing-route";
export async function POST(request: Request){return billingRequest("checkout-session",await request.json())}
