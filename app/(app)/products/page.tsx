"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import type { Product, ProductVariant, StockAdjustment } from "@/types";

type VariantRow = { id: string; size_label: string; price: number; stock_qty: number; low_stock_threshold: number };
type ProductRow = Product & { variants: VariantRow[]; category: { name: string } | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [qtyChange, setQtyChange] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    const res = await apiFetch("/api/products");
    setProducts(await res.json());
    setLoading(false);
  }, []);

  const loadAdjustments = useCallback(async () => {
    const res = await apiFetch("/api/stock/adjustments");
    setAdjustments((await res.json()) ?? []);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (adjustOpen) loadAdjustments(); }, [adjustOpen, loadAdjustments]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const hasVariants = (selectedProduct?.variants?.length ?? 0) > 0;

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !qtyChange) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/stock/adjust", {
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
      loadProducts();
      loadAdjustments();
    } finally {
      setSaving(false);
    }
  }

  function getStockBadge(stock: number, threshold: number) {
    if (stock === 0) return <Badge variant="destructive" className="text-[10px]">Out</Badge>;
    if (stock <= threshold) return <Badge variant="secondary" className="text-[10px]">Low: {stock}</Badge>;
    return <span className="text-xs text-muted-foreground">{stock}</span>;
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl tracking-tight">Products</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAdjustOpen(true)}>Adjust Stock</Button>
          <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Stock Adjustment</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pb-4 mt-4">
                <form onSubmit={handleAdjust} className="space-y-3">
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
                    <p className="text-xs text-muted-foreground">Positive to add stock, negative to reduce.</p>
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
                  <div key={a.id} className="text-sm border rounded-xl p-3">
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
            </SheetContent>
          </Sheet>

          <Link href="/products/new">
            <Button size="sm">+ Add</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const pHasVariants = (p.variants?.length ?? 0) > 0;
            const totalStock = pHasVariants
              ? p.variants.reduce((s, v) => s + v.stock_qty, 0)
              : (p.stock_qty ?? 0);
            return (
              <div key={p.id} className="bg-card border rounded-xl p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{p.name}</p>
                  {p.is_fish && <Badge variant="outline" className="text-[10px]">Fish</Badge>}
                  {p.category?.name && (
                    <Badge variant="secondary" className="text-[10px]">{p.category.name}</Badge>
                  )}
                </div>

                {pHasVariants ? (
                  <div className="mt-1 space-y-0.5">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{v.size_label} · {formatCurrency(v.price)}</span>
                        {getStockBadge(v.stock_qty, v.low_stock_threshold)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-medium">{formatCurrency(p.price ?? 0)}</p>
                    {getStockBadge(totalStock, p.low_stock_threshold)}
                  </div>
                )}
              </div>
            );
          })}
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No products yet</p>
          )}
        </div>
      )}
    </div>
  );
}
