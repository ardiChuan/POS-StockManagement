import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().split("T")[0];
    const to = searchParams.get("to") ?? from;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const total = (data as { amount: number }[] | null)?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
    return NextResponse.json({ from, to, total, items: data });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
