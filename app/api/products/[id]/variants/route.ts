import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { id: product_id } = await params;
    const { size_label, price, stock_qty, low_stock_threshold } = await req.json();

    if (!size_label?.trim() || price == null) {
      return NextResponse.json({ error: "size_label and price required" }, { status: 400 });
    }

    // If variants now exist, clear product-level price/stock_qty
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", product_id)
      .single();

    await supabase
      .from("products")
      .update({ price: null, stock_qty: null, updated_at: new Date().toISOString() })
      .eq("id", product_id);

    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id,
        product_name: product?.name ?? null,
        size_label: size_label.trim(),
        price,
        stock_qty: stock_qty ?? 0,
        low_stock_threshold: low_stock_threshold ?? 5,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
