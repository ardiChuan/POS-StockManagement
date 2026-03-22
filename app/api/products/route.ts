import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies, requireRole, AuthError } from "@/lib/auth";

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
    requireRole(device, ["admin", "owner"]);

    const body = await req.json();
    const { name, category_id, is_fish, price, stock_qty, low_stock_threshold } = body;

    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        category_id: category_id || null,
        is_fish: is_fish ?? false,
        price: price ?? null,
        stock_qty: stock_qty ?? null,
        low_stock_threshold: low_stock_threshold ?? 5,
        updated_at: new Date().toISOString(),
      })
      .select("*, category:categories(*), variants:product_variants(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
