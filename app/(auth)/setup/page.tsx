"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { DeviceRole } from "@/types";

export default function SetupPage() {
  const router = useRouter();
  const [isFirstSetup, setIsFirstSetup] = useState<boolean | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeName2, setStoreName2] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<DeviceRole>("cashier");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        setIsFirstSetup(!d.setup_complete);
        setStoreName2(d.store_name);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accessCode.trim()) return toast.error("All fields are required");
    if (isFirstSetup && !storeName.trim()) return toast.error("Store name is required");

    setLoading(true);
    try {
      const res = await apiFetch("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          store_name: isFirstSetup ? storeName.trim() : undefined,
          access_code: accessCode,
          name: name.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Setup failed");

      toast.success("Device registered!");
      router.replace(data.role === "cashier" ? "/pos" : "/dashboard");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (isFirstSetup === null) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isFirstSetup ? "Store Setup" : storeName2 ?? "Arowana POS"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFirstSetup ? "First-time store configuration" : "Register this device"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFirstSetup && (
            <div className="space-y-1">
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                placeholder="e.g. Arowana Kingdom"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="e.g. Ahmad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as DeviceRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="access_code">{isFirstSetup ? "Set Access Code" : "Access Code"}</Label>
            <Input
              id="access_code"
              type="password"
              placeholder={isFirstSetup ? "Create a store access code" : "Enter store access code"}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Setting up…" : isFirstSetup ? "Set Up Store" : "Register Device"}
          </Button>
        </form>
      </div>
    </div>
  );
}
