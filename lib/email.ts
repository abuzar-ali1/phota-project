import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!);
}

export async function sendOtpEmail(email: string, name: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `phota-otp-${crypto.randomUUID()}` },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from, to: [email], subject: "Your PHOTA verification code",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#132026"><h1 style="font-size:24px">Verify your PHOTA email</h1><p>Hello ${escapeHtml(name)},</p><p>Use this one-time code to verify your account:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;padding:18px;background:#edfdf7;border-radius:12px;text-align:center">${code}</div><p style="color:#52646d">The code expires in 10 minutes. PHOTA will never ask you to share it.</p></div>`,
      text: `Hello ${name}, your PHOTA verification code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) throw new Error("The verification email could not be delivered.");
  return { delivered: true };
}
