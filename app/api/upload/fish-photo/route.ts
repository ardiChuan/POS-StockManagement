import { NextRequest, NextResponse } from "next/server";
import { getDeviceFromCookies } from "@/lib/auth";
import { uploadFishPhoto } from "@/lib/supabase/storage";

export async function POST(req: NextRequest) {
  try {
    const device = await getDeviceFromCookies();
    if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    console.error("[upload/fish-photo]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
