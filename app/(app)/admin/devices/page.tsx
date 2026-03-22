"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import type { Device } from "@/types";

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [self, setSelf] = useState<string | null>(null);

  async function loadDevices() {
    const [devRes, meRes] = await Promise.all([
      fetch("/api/devices"),
      fetch("/api/auth/me"),
    ]);
    setDevices(await devRes.json());
    const me = await meRes.json();
    setSelf(me.id);
    setLoading(false);
  }

  useEffect(() => { loadDevices(); }, []);

  async function deactivate(id: string) {
    if (!confirm("Deactivate this device? They will need to re-register.")) return;
    const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to deactivate");
    toast.success("Device deactivated");
    loadDevices();
  }

  const roleColor: Record<string, "default" | "secondary" | "outline"> = {
    owner: "default", admin: "secondary", cashier: "outline",
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl">Registered Devices</h1>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className={`bg-white border rounded-xl p-3 flex justify-between items-start ${!d.is_active ? "opacity-50" : ""}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{d.name}</p>
                  {d.id === self && <Badge variant="outline" className="text-[10px]">You</Badge>}
                  {!d.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                </div>
                <Badge variant={roleColor[d.role] ?? "outline"} className="text-[10px] mt-0.5">{d.role}</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered {formatDateTime(d.registered_at)}
                  {d.last_seen_at && ` · Last seen ${formatDateTime(d.last_seen_at)}`}
                </p>
              </div>
              {d.is_active && d.id !== self && (
                <Button size="sm" variant="destructive" onClick={() => deactivate(d.id)}>Remove</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
