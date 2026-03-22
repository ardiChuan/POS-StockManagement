import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";

export default async function RootPage() {
  const device = await getDeviceFromCookies();

  if (!device) {
    redirect("/setup");
  }

  if (device.role === "cashier") {
    redirect("/pos");
  }

  redirect("/dashboard");
}
