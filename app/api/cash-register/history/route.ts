import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "30");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const { data, error, count } = await supabase
      .from("cash_register")
      .select("*, closed_by:devices(id,name)", { count: "exact" })
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
