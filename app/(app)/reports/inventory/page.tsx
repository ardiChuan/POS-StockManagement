import { supabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type VariantRow = { id: string; size_label: string; price: number; stock_qty: number; low_stock_threshold: number };
type ProductRow = { id: string; name: string; is_fish: boolean; track_stock: boolean; variants: VariantRow[] };
type FishRow = { id: string };

export default async function ReportsInventoryPage() {
  const [{ data: rawProducts }, { data: rawFish }] = await Promise.all([
    supabase.from("products").select("*, variants:product_variants(*)").eq("is_active", true).order("name"),
    supabase.from("fish").select("id, fish_display_id, tank_id, status").eq("status", "available"),
  ]);
  const products = rawProducts as ProductRow[] | null;
  const fish = rawFish as FishRow[] | null;

  const rows = (products ?? []).flatMap((p) =>
    (p.variants ?? []).map((v) => ({
      key: v.id,
      name: v.size_label ? `${p.name} (${v.size_label})` : p.name,
      is_fish: p.is_fish,
      track_stock: p.track_stock,
      price: v.price,
      stock: v.stock_qty,
      threshold: v.low_stock_threshold,
    }))
  );

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-2xl tracking-tight">Inventory</h1>

      <div className="bg-card border rounded-xl p-3 text-sm">
        <p className="font-semibold">Individual Fish Available</p>
        <p className="text-2xl font-bold">{fish?.length ?? 0}</p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="bg-card border rounded-xl p-3 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{row.name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(row.price)}</p>
            </div>
            <div className="ml-2 text-right flex-shrink-0">
              {!row.track_stock ? (
                <Badge variant="outline">Untracked</Badge>
              ) : (
                <Badge
                  variant={row.stock === 0 ? "destructive" : row.stock <= row.threshold ? "secondary" : "outline"}
                >
                  {row.stock === 0 ? "Out of stock" : `${row.stock}`}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
