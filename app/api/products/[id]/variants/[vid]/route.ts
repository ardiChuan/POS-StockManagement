import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { vid } = await params;
    const { size_label, price, stock_qty, low_stock_threshold } = await req.json();

    const { data, error } = await supabase
      .from("product_variants")
      .update({
        size_label: size_label?.trim(),
        price,
        stock_qty,
        low_stock_threshold,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vid)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { id: product_id, vid } = await params;
    const { error } = await supabase.from("product_variants").delete().eq("id", vid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If no variants left, restore product-level stock tracking (set to 0)
    const { data: remaining } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", product_id);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("products")
        .update({ price: 0, stock_qty: 0, updated_at: new Date().toISOString() })
        .eq("id", product_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
