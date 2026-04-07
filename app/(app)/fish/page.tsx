import { getDeviceFromCookies } from "@/lib/auth";
import { supabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

type FishRow = { id: string; fish_display_id: string; tank_id: string; size_label: string | null; photo_url: string | null; price: number; status: string; notes: string | null; sold_at: string | null; created_at: string };

export default async function FishPage() {
  const device = await getDeviceFromCookies();
  if (!device) return null;

  const { data: fishData } = await supabase
    .from("fish")
    .select("*")
    .order("created_at", { ascending: false });
  const fish = fishData as FishRow[] | null;

  const available = fish?.filter((f) => f.status === "available") ?? [];
  const sold = fish?.filter((f) => f.status === "sold") ?? [];

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Fish</h1>
        <Link href="/fish/new">
          <Button size="sm">+ Add Fish</Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">{available.length} available · {sold.length} sold</p>

      <div className="space-y-2">
        {available.map((f) => (
          <div key={f.id} className="bg-white border rounded-xl p-3 flex items-center gap-3">
            {f.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.photo_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{f.fish_display_id}</p>
                <Badge variant="secondary" className="text-[10px]">{f.tank_id}</Badge>
              </div>
              {f.size_label && <p className="text-xs text-muted-foreground">{f.size_label}</p>}
              <p className="font-bold mt-0.5">{formatCurrency(f.price)}</p>
            </div>
            <Link href={`/fish/${f.id}/edit`}>
              <Button size="sm" variant="ghost">Edit</Button>
            </Link>
          </div>
        ))}
      </div>

      {sold.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
            Sold fish ({sold.length})
          </summary>
          <div className="space-y-2 mt-2">
            {sold.map((f) => (
              <div key={f.id} className="bg-zinc-50 border rounded-xl p-3 flex items-center gap-3 opacity-60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{f.fish_display_id}</p>
                    <Badge variant="outline" className="text-[10px]">SOLD</Badge>
                  </div>
                  {f.sold_at && <p className="text-xs text-muted-foreground">Sold {formatDate(f.sold_at)}</p>}
                  <p className="text-sm mt-0.5">{formatCurrency(f.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
