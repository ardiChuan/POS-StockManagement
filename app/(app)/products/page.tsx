import { getDeviceFromCookies } from "@/lib/auth";
import { supabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

type VariantRow = { id: string; size_label: string; price: number; stock_qty: number; low_stock_threshold: number };
type ProductRow = { id: string; name: string; is_fish: boolean; price: number | null; stock_qty: number | null; low_stock_threshold: number; category: { name: string } | null; variants: VariantRow[] };

export default async function ProductsPage() {
  const device = await getDeviceFromCookies();
  if (!device) return null;

  const { data: rawProducts } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("is_active", true)
    .order("name");
  const products = rawProducts as ProductRow[] | null;

  const canEdit = device.role !== "cashier";

  function getStockBadge(stock: number, threshold: number) {
    if (stock === 0) return <Badge variant="destructive" className="text-[10px]">Out</Badge>;
    if (stock <= threshold) return <Badge variant="secondary" className="text-[10px]">Low: {stock}</Badge>;
    return <span className="text-xs text-muted-foreground">{stock}</span>;
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Products</h1>
        {canEdit && (
          <Link href="/products/new">
            <Button size="sm">+ Add</Button>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {products?.map((p) => {
          const hasVariants = (p.variants?.length ?? 0) > 0;
          const totalStock = hasVariants
            ? p.variants!.reduce((s: number, v: { stock_qty: number }) => s + v.stock_qty, 0)
            : (p.stock_qty ?? 0);
          return (
            <div key={p.id} className="bg-white border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{p.name}</p>
                    {p.is_fish && <Badge variant="outline" className="text-[10px]">Fish</Badge>}
                    {(p.category as { name: string } | null)?.name && (
                      <Badge variant="secondary" className="text-[10px]">{(p.category as { name: string }).name}</Badge>
                    )}
                  </div>

                  {hasVariants ? (
                    <div className="mt-1 space-y-0.5">
                      {p.variants!.map((v: { id: string; size_label: string; price: number; stock_qty: number; low_stock_threshold: number }) => (
                        <div key={v.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{v.size_label} · {formatCurrency(v.price)}</span>
                          {getStockBadge(v.stock_qty, v.low_stock_threshold)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-medium">{formatCurrency(p.price ?? 0)}</p>
                      {getStockBadge(totalStock, p.low_stock_threshold)}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <Link href={`/products/${p.id}/edit`}>
                    <Button size="sm" variant="ghost">Edit</Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {(!products || products.length === 0) && (
          <p className="text-center text-muted-foreground py-8">No products yet</p>
        )}
      </div>
    </div>
  );
}
