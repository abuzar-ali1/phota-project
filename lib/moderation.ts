import "server-only";

export type ModerationDecision = { allowed: boolean; reason: string | null; source: "local" | "openai" | "local-fallback" };

const localRules = [
  { pattern: /\b(?:pay|payment|cash|money|fee|price|sell|buy|bank|iban|easypaisa|jazzcash|rupees?|pkr|transfer|wallet|compensation|reward|account\s*number)\b/i, reason: "Financial solicitation is not allowed in donor communication." },
  { pattern: /\b\d{13}\b/, reason: "Do not share CNIC or national identity numbers in chat." },
  { pattern: /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?92|0)3\d{9}|(?:\d[\s().-]*){7,}|\b(?:whats?\s*app|telegram|signal|instagram|contact\s+me|call\s+me|dm\s+me)\b)/i, reason: "Keep communication inside PHOTA and do not share private contact details." },
  { pattern: /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}\b/i, reason: "Do not spell out private phone numbers in chat." },
  { pattern: /\b(?:kill|hurt|threat|force|blackmail|harass|weapon)\b/i, reason: "Threatening or coercive communication is blocked." },
  { pattern: /\b(?:guaranteed cure|ignore your doctor|stop medication|no doctor needed)\b/i, reason: "Unsafe medical instructions are not allowed." },
];

export async function moderateMessage(raw: string): Promise<ModerationDecision> {
  const content = raw.trim().replace(/\s+/g," ").slice(0,800);
  for (const rule of localRules) if (rule.pattern.test(content)) return { allowed:false,reason:rule.reason,source:"local" };
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return { allowed:false,reason:"AI safety moderation is not configured. Message delivery is paused.",source:"local-fallback" };
  try {
    const response=await fetch("https://api.openai.com/v1/moderations",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"omni-moderation-latest",input:content}),signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw new Error("Moderation request failed");
    const payload=await response.json() as {results?:Array<{flagged?:boolean;categories?:Record<string,boolean>}>};
    const result=payload.results?.[0];
    if(!result||typeof result.flagged!=="boolean")throw new Error("Invalid moderation response");
    if (result?.flagged) {
      const categories=Object.entries(result.categories||{}).filter(([,flagged])=>flagged).map(([name])=>name.replaceAll("/"," ")).slice(0,3);
      return {allowed:false,reason:`The safety moderator blocked this message${categories.length?`: ${categories.join(", ")}`:"."}`,source:"openai"};
    }
    return {allowed:true,reason:null,source:"openai"};
  } catch (error) {
    console.error("AI moderation unavailable; local safeguards applied",error);
    return {allowed:false,reason:"AI safety moderation is temporarily unavailable. Message delivery is paused.",source:"local-fallback"};
  }
}
