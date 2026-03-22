import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { actual_cash, notes } = await req.json();
  if (actual_cash == null) return NextResponse.json({ error: "actual_cash required" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  // Get or create today's register
  let { data: register } = await supabase
    .from("cash_register")
    .select("*")
    .eq("date", today)
    .single();

  if (!register) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: prev } = await supabase
      .from("cash_register")
      .select("actual_cash")
      .eq("date", yesterday.toISOString().split("T")[0])
      .single();

    const { data: created } = await supabase
      .from("cash_register")
      .insert({ date: today, opening_balance: prev?.actual_cash ?? 0 })
      .select()
      .single();
    register = created;
  }

  // Calculate expected
  const [{ data: salesData }, { data: expensesData }] = await Promise.all([
    supabase.from("sales").select("total").eq("payment_method", "cash").gte("created_at", todayStart).lte("created_at", todayEnd),
    supabase.from("expenses").select("amount").gte("created_at", todayStart).lte("created_at", todayEnd),
  ]);

  const cashSales = (salesData as { total: number }[] | null)?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const expenses = (expensesData as { amount: number }[] | null)?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const openingBalance = register?.opening_balance ?? 0;
  const expectedCash = openingBalance + cashSales - expenses;
  const discrepancy = actual_cash - expectedCash;

  const { data, error } = await supabase
    .from("cash_register")
    .update({
      expected_cash: expectedCash,
      actual_cash,
      discrepancy,
      notes: notes?.trim() || null,
      closed_by_device_id: device.id,
      closed_at: new Date().toISOString(),
    })
    .eq("date", today)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
