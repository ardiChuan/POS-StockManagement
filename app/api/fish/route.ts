import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "available";

  let query = supabase.from("fish").select("*").order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();

    const body = await req.json();
    const { fish_display_id, tank_id, size_label, photo_url, price, notes } = body;

    if (!fish_display_id?.trim() || !tank_id?.trim() || price == null) {
      return NextResponse.json({ error: "fish_display_id, tank_id, and price are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("fish")
      .insert({
        fish_display_id: fish_display_id.trim(),
        tank_id: tank_id.trim(),
        size_label: size_label?.trim() || null,
        photo_url: photo_url || null,
        price,
        notes: notes?.trim() || null,
        status: "available",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Fish ID already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
