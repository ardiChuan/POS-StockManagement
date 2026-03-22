import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { supabase } from "@/lib/supabase/server";
import { FishForm } from "@/components/fish/FishForm";

export default async function EditFishPage({ params }: { params: Promise<{ id: string }> }) {
  const device = await getDeviceFromCookies();
  if (!device || device.role === "cashier") redirect("/fish");

  const { id } = await params;
  const { data: fish } = await supabase.from("fish").select("*").eq("id", id).single();
  if (!fish) redirect("/fish");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl mb-4">Edit Fish</h1>
      <FishForm fish={fish} />
    </div>
  );
}
