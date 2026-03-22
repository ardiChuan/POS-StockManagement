"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import type { Product, ProductVariant, StockAdjustment } from "@/types";

export default function StockPage() {
  const [products, setProducts] = useState<(Product & { variants: ProductVariant[] })[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [qtyChange, setQtyChange] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function loadData() {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stock/adjustments").then((r) => r.json()),
    ]).then(([prods, adjs]) => {
      setProducts(prods);
      setAdjustments(adjs ?? []);
    });
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const hasVariants = (selectedProduct?.variants?.length ?? 0) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !qtyChange) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          variant_id: selectedVariantId || null,
          qty_change: Number(qtyChange),
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Adjustment failed");
      toast.success(`Stock updated. New qty: ${data.stock_qty}`);
      setQtyChange("");
      setNote("");
      loadData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl">Stock Adjustment</h1>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-3">
        <div className="space-y-1">
          <Label>Product *</Label>
          <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v ?? ""); setSelectedVariantId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select product…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasVariants && (
          <div className="space-y-1">
            <Label>Size / Variant *</Label>
            <Select value={selectedVariantId} onValueChange={(v) => setSelectedVariantId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant…" />
              </SelectTrigger>
              <SelectContent>
                {selectedProduct?.variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.size_label} (stock: {v.stock_qty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label>Quantity Change *</Label>
          <Input
            type="number"
            placeholder="e.g. +10 or -3"
            value={qtyChange}
            onChange={(e) => setQtyChange(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Use positive to add stock, negative to reduce.</p>
        </div>

        <div className="space-y-1">
          <Label>Note</Label>
          <Input placeholder="Reason for adjustment…" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={saving || !selectedProductId || (hasVariants && !selectedVariantId)}>
          {saving ? "Saving…" : "Apply Adjustment"}
        </Button>
      </form>

      <Separator />
      <p className="font-semibold text-sm">Recent Adjustments</p>
      {adjustments.length === 0 && (
        <p className="text-sm text-muted-foreground">No adjustments recorded yet.</p>
      )}
      {adjustments.map((a) => (
        <div key={a.id} className="text-sm border rounded-xl p-3 bg-white">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="font-medium">{a.qty_change > 0 ? `+${a.qty_change}` : a.qty_change}</span>
              {a.product && (
                <span className="text-muted-foreground ml-1">
                  {(a.product as { name: string }).name}
                  {a.variant && ` (${(a.variant as { size_label: string }).size_label})`}
                </span>
              )}
              {a.note && <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatDateTime(a.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
