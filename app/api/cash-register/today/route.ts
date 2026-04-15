import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";
import { getYesterdayOpeningBalance } from "@/lib/cash-register";

export async function GET() {
  const device = await getDeviceFromCookies();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Get or create today's register
  let { data: register } = await supabase
    .from("cash_register")
    .select("*")
    .eq("date", today)
    .single();

  if (!register) {
    const openingBalance = await getYesterdayOpeningBalance();
    const { data: created } = await supabase
      .from("cash_register")
      .insert({ date: today, opening_balance: openingBalance })
      .select()
      .single();
    register = created;
  }

  // Calculate live expected cash
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [{ data: salesData }, { data: expensesData }] = await Promise.all([
    supabase
      .from("sales")
      .select("total, payment_method")
      .eq("payment_method", "cash")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
  ]);

  const cashSalesTotal = (salesData as { total: number }[] | null)?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const expensesTotal = (expensesData as { amount: number }[] | null)?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const openingBalance = register?.opening_balance ?? 0;
  const expectedCash = openingBalance + cashSalesTotal - expensesTotal;

  return NextResponse.json({
    date: today,
    opening_balance: openingBalance,
    cash_sales_total: cashSalesTotal,
    expenses_total: expensesTotal,
    expected_cash: expectedCash,
    actual_cash: register?.actual_cash ?? null,
    discrepancy: register?.discrepancy ?? null,
    closed_at: register?.closed_at ?? null,
    is_closed: !!register?.closed_at,
  });
}
