"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import s from "./auth.module.css";
export function LogoutButton(){const router=useRouter();const[pending,setPending]=useState(false);async function logout(){setPending(true);await fetch("/api/auth/logout",{method:"POST"});router.push("/");router.refresh()}return <button className={s.logout} disabled={pending} onClick={logout}>{pending?"Signing out…":"Sign out"}</button>}
