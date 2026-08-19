import { BillingSuccess } from "@/components/billing-result";
export default async function SuccessPage({searchParams}:PageProps<"/billing/success">){const{reference}=await searchParams;return <BillingSuccess reference={typeof reference==="string"?reference:""}/>}
