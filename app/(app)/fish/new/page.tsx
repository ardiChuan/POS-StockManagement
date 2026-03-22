import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { FishForm } from "@/components/fish/FishForm";

export default async function NewFishPage() {
  const device = await getDeviceFromCookies();
  if (!device || device.role === "cashier") redirect("/fish");
  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl mb-4">Add Fish</h1>
      <FishForm />
    </div>
  );
}
