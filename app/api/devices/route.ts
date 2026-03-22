import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies, requireRole, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const device = await getDeviceFromCookies();
    requireRole(device, ["admin", "owner"]);

    const { data, error } = await supabase
      .from("devices")
      .select("id, name, role, is_active, registered_at, last_seen_at")
      .order("registered_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
