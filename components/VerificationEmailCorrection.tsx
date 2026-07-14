"use client";
import {LoaderCircle,Mail} from "lucide-react";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";

export function VerificationEmailCorrection({accountType,currentEmail}:{accountType:"hospital"|"public";currentEmail:string}){
  const router=useRouter();const[pending,setPending]=useState(false);const[message,setMessage]=useState("");const[error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setError("");setMessage("");const data=new FormData(event.currentTarget);try{const response=await fetch("/api/verification/email",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountType,email:data.get("email")})});const result=await response.json();if(!response.ok)throw new Error(result.error);setMessage(result.deliveryWarning?`Email updated. ${result.deliveryWarning}`:"Email updated and a fresh code was sent.");router.refresh();}catch(caught){setError(caught instanceof Error?caught.message:"Email could not be corrected.");}finally{setPending(false);}}
  return <details className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4"><summary className="cursor-pointer text-sm font-semibold text-cyan-200">Wrong or inaccessible email?</summary><form onSubmit={submit} className="mt-4 space-y-3"><label className="auth-field"><span>Correct email address</span><div><Mail/><input name="email" type="email" required defaultValue={currentEmail} autoComplete="email"/></div></label>{message&&<p role="status" className="text-xs leading-5 text-emerald-200">{message}</p>}{error&&<p role="alert" className="text-xs leading-5 text-rose-200">{error}</p>}<button disabled={pending} className="secondary-btn w-full">{pending?<LoaderCircle className="animate-spin"/>:<Mail/>} Update email and resend</button></form></details>;
}
