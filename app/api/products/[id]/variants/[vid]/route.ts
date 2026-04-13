import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // If no variants left, create default variant so product always has at least 1
    const { data: remaining } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", product_id);

    if (!remaining || remaining.length === 0) {
      const { data: prod } = await supabase.from("products").select("name, low_stock_threshold").eq("id", product_id).single();
      await supabase.from("product_variants").insert({
        product_id,
        product_name: prod?.name ?? null,
        size_label: "",
        price: 0,
        stock_qty: 0,
        low_stock_threshold: prod?.low_stock_threshold ?? 5,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
