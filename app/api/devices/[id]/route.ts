import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const device = await getDeviceFromCookies();

    const { id } = await params;

    if (id === device!.id) {
      return NextResponse.json({ error: "Cannot deactivate your own device" }, { status: 400 });
    }

    const { error } = await supabase
      .from("devices")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
