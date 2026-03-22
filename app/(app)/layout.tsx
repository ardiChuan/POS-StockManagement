import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const device = await getDeviceFromCookies();

  if (!device) redirect("/setup");

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <OfflineBanner />
      <main className="flex-1">{children}</main>
      <BottomNav role={device.role} />
    </div>
  );
}
