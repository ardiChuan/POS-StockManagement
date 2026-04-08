import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const device = await getDeviceFromCookies();

    type VariantRow = { size_label: string; price: number; stock_qty: number; low_stock_threshold: number };
    type ProductRow = { id: string; name: string; is_fish: boolean; price: number | null; stock_qty: number | null; low_stock_threshold: number; variants: VariantRow[] };

    const [{ data: rawProducts }, { data: fishAvailable }] = await Promise.all([
      supabase
        .from("products")
        .select("*, variants:product_variants(*)")
        .eq("is_active", true)
        .order("name"),
      supabase.from("fish").select("id").eq("status", "available"),
    ]);
    const products = rawProducts as ProductRow[] | null;

    const productRows = (products ?? []).map((p) => {
      if (p.variants?.length) {
        return p.variants.map((v: { size_label: string; price: number; stock_qty: number; low_stock_threshold: number }) => ({
          id: p.id,
          name: `${p.name} (${v.size_label})`,
          is_fish: p.is_fish,
          stock_qty: v.stock_qty,
          price: v.price,
          low_stock_threshold: v.low_stock_threshold,
          is_low_stock: v.stock_qty <= v.low_stock_threshold && v.stock_qty > 0,
          is_out_of_stock: v.stock_qty === 0,
        }));
      }
      return [{
        id: p.id,
        name: p.name,
        is_fish: p.is_fish,
        stock_qty: p.stock_qty ?? 0,
        price: p.price ?? 0,
        low_stock_threshold: p.low_stock_threshold,
        is_low_stock: (p.stock_qty ?? 0) <= p.low_stock_threshold && (p.stock_qty ?? 0) > 0,
        is_out_of_stock: (p.stock_qty ?? 0) === 0,
      }];
    }).flat();

    return NextResponse.json({
      products: productRows,
      individual_fish_available: fishAvailable?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
