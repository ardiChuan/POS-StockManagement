"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Fish } from "@/types";

export function FishForm({ fish }: { fish?: Fish }) {
  const router = useRouter();
  const isEdit = !!fish;

  const [fishDisplayId, setFishDisplayId] = useState(fish?.fish_display_id ?? "");
  const [tankId, setTankId] = useState(fish?.tank_id ?? "");
  const [sizeLabel, setSizeLabel] = useState(fish?.size_label ?? "");
  const [price, setPrice] = useState(fish?.price?.toString() ?? "");
  const [notes, setNotes] = useState(fish?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(fish?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    if (!fish?.id && !isEdit) {
      // Need to save fish first to get an ID for storage path
      toast.error("Save the fish first, then upload a photo");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fish_id", fish!.id);
      const res = await fetch("/api/upload/fish-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Upload failed");
      setPhotoUrl(data.url);
      toast.success("Photo uploaded");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fishDisplayId.trim() || !tankId.trim() || !price) return toast.error("ID, tank, and price are required");

    setSaving(true);
    try {
      const url = isEdit ? `/api/fish/${fish!.id}` : "/api/fish";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fish_display_id: fishDisplayId.trim(),
          tank_id: tankId.trim(),
          size_label: sizeLabel.trim() || null,
          price: Number(price),
          notes: notes.trim() || null,
          photo_url: photoUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Save failed");
      toast.success(isEdit ? "Fish updated" : "Fish added");
      router.push("/fish");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!fish || !confirm("Delete this fish?")) return;
    const res = await fetch(`/api/fish/${fish.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Delete failed");
    toast.success("Fish deleted");
    router.push("/fish");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Fish ID *</Label>
        <Input placeholder="e.g. F-001" value={fishDisplayId} onChange={(e) => setFishDisplayId(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Tank *</Label>
        <Input placeholder="e.g. Tank A" value={tankId} onChange={(e) => setTankId(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Size</Label>
        <Input placeholder="e.g. 30cm, Jumbo" value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Price (Rp) *</Label>
        <Input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea placeholder="Any notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label>Photo</Label>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-32 h-32 object-cover rounded-xl border" />
        )}
        {isEdit && (
          <>
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
            <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : photoUrl ? "Change Photo" : "Upload Photo"}
            </Button>
          </>
        )}
        {!isEdit && <p className="text-xs text-muted-foreground">You can add a photo after saving the fish.</p>}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update Fish" : "Add Fish"}
        </Button>
        {isEdit && fish.status !== "sold" && (
          <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
        )}
      </div>
      <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>Cancel</Button>
    </form>
  );
}
