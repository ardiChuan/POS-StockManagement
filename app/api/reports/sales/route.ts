import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().split("T")[0];
    const to = searchParams.get("to") ?? from;

    const fromISO = `${from}T00:00:00.000Z`;
    const toISO = `${to}T23:59:59.999Z`;

    const { data: sales, error } = await supabase
      .from("sales")
      .select("id, total, payment_method, created_at, items:sale_items(line_total)")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type SaleRow = { total: number; payment_method: string };
    const typedSales = sales as SaleRow[] | null;
    const totalRevenue = typedSales?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
    const cashRevenue = typedSales?.filter((s) => s.payment_method === "cash").reduce((s, r) => s + Number(r.total), 0) ?? 0;
    const transferRevenue = typedSales?.filter((s) => s.payment_method === "bank_transfer").reduce((s, r) => s + Number(r.total), 0) ?? 0;
    const transactionCount = typedSales?.length ?? 0;

    return NextResponse.json({
      from,
      to,
      total_revenue: totalRevenue,
      cash_revenue: cashRevenue,
      transfer_revenue: transferRevenue,
      transaction_count: transactionCount,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
