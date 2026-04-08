import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getDeviceFromCookies } from "@/lib/auth";

export async function GET() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    // Upsert (find or create)
    const { data: existing } = await supabase
      .from("categories")
      .select("*")
      .ilike("name", name.trim())
      .single();

    if (existing) return NextResponse.json(existing);

    const { data, error } = await supabase
      .from("categories")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
