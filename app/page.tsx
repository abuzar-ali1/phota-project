import { HomePortalSelector } from "@/components/HomePortalSelector";
import { getCurrentHospital } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hospital = await getCurrentHospital();
  return <HomePortalSelector hospital={hospital ?? undefined} />;
}
