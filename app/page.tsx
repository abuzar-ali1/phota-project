import { PhotaApp } from "@/components/PhotaApp";
import { getCurrentHospital } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hospital = await getCurrentHospital();
  return <PhotaApp hospital={hospital ?? undefined} />;
}
