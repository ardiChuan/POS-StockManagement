import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { id } = await params;
    const body = await req.json();
    const { name, category_id, is_fish, price, stock_qty, low_stock_threshold } = body;

    const { data, error } = await supabase
      .from("products")
      .update({
        name: name?.trim(),
        category_id: category_id ?? null,
        is_fish: is_fish ?? false,
        price: price ?? null,
        stock_qty: stock_qty ?? null,
        low_stock_threshold: low_stock_threshold ?? 5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, category:categories(*), variants:product_variants(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { id } = await params;
    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
