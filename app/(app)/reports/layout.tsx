import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const device = await getDeviceFromCookies();
  if (!device || device.role === "cashier") redirect("/pos");
  return <>{children}</>;
}
