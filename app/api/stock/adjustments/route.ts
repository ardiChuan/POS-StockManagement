import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const device = await getDeviceFromCookies();

    const { data, error } = await supabase
      .from("stock_adjustments")
      .select("*, product:products(name), variant:product_variants(size_label)")
      .eq("adjustment_type", "manual")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
