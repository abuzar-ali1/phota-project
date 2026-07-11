"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
export function LogoutButton({className="secondary-btn"}:{className?:string}){const router=useRouter();return <button className={className} onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");router.refresh();}}><LogOut className="size-4"/> Sign out</button>}
