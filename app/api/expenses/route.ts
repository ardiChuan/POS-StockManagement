import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("expenses")
    .select("*, device:devices(id,name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description, amount } = await req.json();
  if (!description?.trim()) return NextResponse.json({ error: "description required" }, { status: 400 });
  if (amount == null || amount <= 0) return NextResponse.json({ error: "valid amount required" }, { status: 400 });

  const { data, error } = await supabase
    .from("expenses")
    .insert({ description: description.trim(), amount, device_id: device.id })
    .select("*, device:devices(id,name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ensure today's cash_register row exists (expenses affect expected_cash)
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase.from("cash_register").select("id").eq("date", today).single();
  if (!existing) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: prev } = await supabase
      .from("cash_register")
      .select("actual_cash")
      .eq("date", yesterday.toISOString().split("T")[0])
      .single();
    await supabase.from("cash_register").insert({ date: today, opening_balance: prev?.actual_cash ?? 0 });
  }

  return NextResponse.json(data, { status: 201 });
}
