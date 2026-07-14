export async function readApiResponse<T extends Record<string,unknown>>(response:Response,accountType:"public"|"hospital"):Promise<T>{
  const result=await response.json().catch(()=>({error:"The server returned an invalid response."})) as T&{error?:unknown;blocked?:unknown};
  if(response.status===401){window.location.assign(accountType==="public"?"/public/login":"/login");throw new Error("Your session expired. Redirecting to sign in.");}
  if(response.status===428){window.location.assign(accountType==="public"?"/public/verify-email":"/verify-email");throw new Error("Email verification expired. Redirecting to verification.");}
  if(accountType==="public"&&response.status===423){window.location.assign("/public/blocked");throw new Error("Account blocked for security review.");}
  if(!response.ok)throw new Error(typeof result.error==="string"?result.error:"The request could not be completed.");
  return result;
}
