import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/server";
import { deviceCookieOptions } from "@/lib/auth";
import type { DeviceRole } from "@/types";

// POST /api/setup — handles both first-time store setup and subsequent device registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_code, name, role } = body as {
      access_code: string;
      name: string;
      role: DeviceRole;
    };

    if (!access_code || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["owner", "admin", "cashier"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check store config
    const { data: config } = await supabase
      .from("store_config")
      .select("*")
      .eq("id", 1)
      .single();

    let isFirstSetup = !config?.setup_complete;

    if (isFirstSetup) {
      // First-time setup: create store config with provided access code
      const hashedCode = await bcrypt.hash(access_code, 10);
      await supabase.from("store_config").upsert({
        id: 1,
        access_code: hashedCode,
        setup_complete: true,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Subsequent registration: verify access code
      const valid = await bcrypt.compare(access_code, config!.access_code);
      if (!valid) {
        return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
      }
    }

    // Create device record
    const token = crypto.randomBytes(32).toString("hex");
    const { data: device, error: deviceErr } = await supabase
      .from("devices")
      .insert({
        name,
        role,
        device_token: token,
        is_active: true,
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (deviceErr || !device) {
      return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
    }

    const cookieOpts = deviceCookieOptions();
    const response = NextResponse.json({
      success: true,
      role: device.role,
      name: device.name,
    });

    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      maxAge: cookieOpts.maxAge,
      path: cookieOpts.path,
    });

    return response;
  } catch (err) {
    console.error("[setup]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/setup — check if store is configured
export async function GET() {
  const { data: config } = await supabase
    .from("store_config")
    .select("setup_complete")
    .eq("id", 1)
    .single();

  return NextResponse.json({
    setup_complete: config?.setup_complete ?? false,
  });
}
