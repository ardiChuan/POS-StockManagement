import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { product_id, variant_id, qty_change, note } = await req.json();
    if (!product_id || qty_change == null) {
      return NextResponse.json({ error: "product_id and qty_change required" }, { status: 400 });
    }

    if (variant_id) {
      const { data: variant, error: varErr } = await supabase
        .from("product_variants")
        .select("stock_qty")
        .eq("id", variant_id)
        .single();
      if (varErr || !variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

      const newQty = Math.max(0, variant.stock_qty + qty_change);
      await supabase
        .from("product_variants")
        .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
        .eq("id", variant_id);

      await supabase.from("stock_adjustments").insert({
        product_id,
        variant_id,
        adjustment_type: "manual",
        qty_before: variant.stock_qty,
        qty_change,
        qty_after: newQty,
        note: note?.trim() || null,
        device_id: device.id,
      });

      return NextResponse.json({ stock_qty: newQty });
    } else {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("stock_qty")
        .eq("id", product_id)
        .single();
      if (prodErr || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

      const newQty = Math.max(0, (product.stock_qty ?? 0) + qty_change);
      await supabase
        .from("products")
        .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
        .eq("id", product_id);

      await supabase.from("stock_adjustments").insert({
        product_id,
        variant_id: null,
        adjustment_type: "manual",
        qty_before: product.stock_qty ?? 0,
        qty_change,
        qty_after: newQty,
        note: note?.trim() || null,
        device_id: device.id,
      });

      return NextResponse.json({ stock_qty: newQty });
    }
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
