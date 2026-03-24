"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function AdminStorePage() {
  const [storeName, setStoreName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/store-config").then((r) => r.json()).then((d) => setStoreName(d.store_name ?? ""));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newCode && newCode !== confirmCode) return toast.error("Access codes don't match");
    setSaving(true);
    try {
      const res = await apiFetch("/api/store-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName.trim() || undefined,
          new_access_code: newCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Failed to update");
      setNewCode("");
      setConfirmCode("");
      toast.success("Store settings updated");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl">Store Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>Store Name</Label>
          <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>

        <div className="space-y-3 border rounded-xl p-4">
          <p className="font-semibold text-sm">Change Access Code</p>
          <p className="text-xs text-muted-foreground">
            Changing the access code does not affect existing registered devices. New devices will need the new code to register.
          </p>
          <div className="space-y-1">
            <Label>New Access Code</Label>
            <Input type="password" placeholder="Leave blank to keep current" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          </div>
          {newCode && (
            <div className="space-y-1">
              <Label>Confirm Code</Label>
              <Input type="password" placeholder="Repeat new code" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} />
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
