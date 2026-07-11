"use client";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router=useRouter(); const [pending,setPending]=useState(false); const [error,setError]=useState(""); const [show,setShow]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setError("");const data=new FormData(event.currentTarget);try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:data.get("email"),password:data.get("password")})});const result=await response.json();if(!response.ok)throw new Error(result.error);router.replace(result.redirectTo);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to sign in.");}finally{setPending(false);}}
  return <form onSubmit={submit} className="space-y-5"><label className="auth-field"><span>Official hospital email</span><div><Mail/><input name="email" type="email" autoComplete="email" required placeholder="admin@hospital.org"/></div></label><label className="auth-field"><span>Password</span><div><LockKeyhole/><input name="password" type={show?"text":"password"} autoComplete="current-password" required placeholder="Enter your secure password"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}>{show?<EyeOff/>:<Eye/>}</button></div></label>{error&&<p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/8 p-3 text-sm text-rose-200">{error}</p>}<button disabled={pending} className="auth-submit">{pending?<LoaderCircle className="animate-spin"/>:<LogIn/>}{pending?"Verifying…":"Secure sign in"}</button><p className="text-center text-sm text-slate-400">New hospital? <Link href="/signup" className="font-semibold text-emerald-300 hover:text-emerald-200">Apply for access</Link></p></form>;
}

