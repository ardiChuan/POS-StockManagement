import { NextRequest, NextResponse } from "next/server";
import { getDeviceFromCookies, requireRole, AuthError } from "@/lib/auth";
import { uploadFishPhoto } from "@/lib/supabase/storage";

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();
    requireRole(device, ["admin", "owner"]);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fishId = formData.get("fish_id") as string | null;

    if (!file || !fishId) {
      return NextResponse.json({ error: "file and fish_id required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFishPhoto(buffer, file.type, fishId);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[upload/fish-photo]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
