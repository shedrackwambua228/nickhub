"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubscribeButton({plan,label}:{plan:"artist"|"label";label:string}){
  const router=useRouter();const[pending,setPending]=useState(false);const[error,setError]=useState("");
  async function checkout(){setPending(true);setError("");try{const response=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const data=await response.json() as{url?:string;error?:string};if(response.status===401){router.push("/auth/sign-in");return}if(!response.ok||!data.url)throw new Error(data.error||"Unable to start checkout");window.location.assign(data.url)}catch(reason){setError(reason instanceof Error?reason.message:"Unable to start checkout");setPending(false)}}
  return <><button className="button buttonPrimary" disabled={pending} onClick={checkout} type="button">{pending?"Opening secure checkout…":label}</button>{error&&<small role="alert" style={{color:"#a52323",marginTop:8}}>{error}</small>}</>;
}
