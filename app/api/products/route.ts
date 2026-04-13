import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isFish = searchParams.get("is_fish");
  const categoryId = searchParams.get("category_id");

  let query = supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("is_active", true)
    .order("name");

  if (isFish !== null) query = query.eq("is_fish", isFish === "true");
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, category_id, is_fish, track_stock, price, stock_qty, low_stock_threshold } = body;

    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        category_id: category_id || null,
        is_fish: is_fish ?? false,
        track_stock: track_stock ?? true,
        price: null,
        stock_qty: null,
        low_stock_threshold: low_stock_threshold ?? 5,
        updated_at: new Date().toISOString(),
      })
      .select("*, category:categories(*), variants:product_variants(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-create default variant (every product has at least 1 variant)
    await supabase.from("product_variants").insert({
      product_id: data.id,
      product_name: name.trim(),
      size_label: "",
      price: price ?? 0,
      stock_qty: (track_stock ?? true) ? (stock_qty ?? 0) : 0,
      low_stock_threshold: low_stock_threshold ?? 5,
    });

    // Re-fetch with variant included
    const { data: full } = await supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("id", data.id)
      .single();

    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
