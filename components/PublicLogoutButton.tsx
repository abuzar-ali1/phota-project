"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
export function PublicLogoutButton({className="secondary-btn"}:{className?:string}){const router=useRouter();return <button className={className} onClick={async()=>{await fetch("/api/public/auth/logout",{method:"POST"});router.replace("/public/login");router.refresh();}}><LogOut/> Sign out</button>}
