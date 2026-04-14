import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

// POST /api/sales/[id]/refund
// Body: { items: [{ sale_item_id: string, qty: number }] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: saleId } = await params;
    const { items } = await req.json() as { items: { sale_item_id: string; qty: number }[] };

    if (!items?.length) {
      return NextResponse.json({ error: "No items to refund" }, { status: 400 });
    }

    // Load sale items for this sale
    const { data: saleItems, error: itemsErr } = await supabase
      .from("sale_items")
      .select("id, item_type, product_id, variant_id, unit_price, qty, refunded_qty")
      .eq("sale_id", saleId);

    if (itemsErr || !saleItems) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Validate each requested item
    for (const req_item of items) {
      const saleItem = saleItems.find((si) => si.id === req_item.sale_item_id);
      if (!saleItem) {
        return NextResponse.json({ error: `Item ${req_item.sale_item_id} not found in sale` }, { status: 400 });
      }
      const refundable = saleItem.qty - saleItem.refunded_qty;
      if (req_item.qty <= 0 || req_item.qty > refundable) {
        return NextResponse.json({ error: `Invalid refund qty for ${saleItem.id}` }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    let refundedTotal = 0;

    for (const req_item of items) {
      const saleItem = saleItems.find((si) => si.id === req_item.sale_item_id)!;

      // Restore stock for tracked product items
      if (saleItem.item_type === "product" && saleItem.product_id && saleItem.variant_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("track_stock")
          .eq("id", saleItem.product_id)
          .single();

        if (prod?.track_stock) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock_qty")
            .eq("id", saleItem.variant_id)
            .single();

          if (variant) {
            const newQty = variant.stock_qty + req_item.qty;
            await supabase
              .from("product_variants")
              .update({ stock_qty: newQty, updated_at: now })
              .eq("id", saleItem.variant_id);

            await supabase.from("stock_adjustments").insert({
              product_id: saleItem.product_id,
              variant_id: saleItem.variant_id,
              adjustment_type: "refund",
              qty_before: variant.stock_qty,
              qty_change: req_item.qty,
              qty_after: newQty,
              note: `Refund — sale ${saleId}`,
              device_id: device.id,
              related_sale_id: saleId,
            });
          }
        }
      }

      // Mark item as refunded
      await supabase
        .from("sale_items")
        .update({ refunded_qty: saleItem.refunded_qty + req_item.qty })
        .eq("id", saleItem.id);

      refundedTotal += saleItem.unit_price * req_item.qty;
    }

    return NextResponse.json({ refunded_total: refundedTotal });
  } catch (err) {
    console.error("[refund POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
