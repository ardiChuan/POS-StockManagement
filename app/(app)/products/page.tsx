"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import Link from "next/link";
import type { Product, ProductVariant, StockAdjustment } from "@/types";

type VariantRow = { id: string; size_label: string; price: number; stock_qty: number; low_stock_threshold: number };
type ProductRow = Product & { variants: VariantRow[]; category: { name: string } | null };

function isDefaultVariant(v: VariantRow) { return v.size_label === ""; }
function hasRealVariants(p: ProductRow) { return p.variants.some((v) => v.size_label !== ""); }

export default function ProductsPage() {
  const cart = useCart();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Stock adjustment state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [qtyChange, setQtyChange] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Add-to-cart dialog state
  const [cartDialog, setCartDialog] = useState<ProductRow | null>(null);
  const [cartVariant, setCartVariant] = useState<VariantRow | null>(null);
  const [cartQty, setCartQty] = useState("1");

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
  const selectedHasRealVariants = selectedProduct ? hasRealVariants(selectedProduct) : false;

  // Auto-select default variant for single products in stock adjustment
  useEffect(() => {
    if (selectedProduct && !selectedHasRealVariants) {
      const def = selectedProduct.variants.find(isDefaultVariant);
      if (def) setSelectedVariantId(def.id);
    } else if (selectedProduct && selectedHasRealVariants) {
      setSelectedVariantId("");
    }
  }, [selectedProductId, selectedProduct, selectedHasRealVariants]);

  const filteredProducts = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !selectedVariantId || !qtyChange) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          variant_id: selectedVariantId,
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

  function openCartDialog(p: ProductRow) {
    setCartDialog(p);
    // For single products (default variant), auto-select it
    if (!hasRealVariants(p)) {
      const def = p.variants.find(isDefaultVariant);
      setCartVariant(def ?? null);
    } else {
      setCartVariant(null);
    }
    setCartQty("1");
  }

  function confirmAddToCart() {
    if (!cartDialog || !cartVariant) return;
    const qty = parseFloat(cartQty) || 1;
    cart.addItem({
      key: `product-${cartDialog.id}-${cartVariant.id}`,
      item_type: "product",
      product_id: cartDialog.id,
      variant_id: cartVariant.id,
      category_name: cartDialog.category?.name ?? undefined,
      description: cartVariant.size_label
        ? `${cartDialog.name} (${cartVariant.size_label})`
        : cartDialog.name,
      unit_price: cartVariant.price,
      qty,
    });
    toast.success("Added to cart");
    setCartDialog(null);
    setCartVariant(null);
    setCartQty("1");
  }

  function getStockBadge(stock: number, threshold: number) {
    if (stock === 0) return <span className="text-xs font-medium text-red-500">{stock}</span>;
    if (stock <= threshold) return <span className="text-xs font-medium text-amber-500">{stock}</span>;
    return <span className="text-xs text-muted-foreground">{stock}</span>;
  }

  const cartDialogHasRealVariants = cartDialog ? hasRealVariants(cartDialog) : false;
  const showQtyStep = !cartDialogHasRealVariants || cartVariant !== null;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl tracking-tight">Stocks</h1>
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
                      <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
                      <SelectContent>
                        {products.filter((p) => p.track_stock).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedHasRealVariants && (
                    <div className="space-y-1">
                      <Label>Size / Variant *</Label>
                      <Select value={selectedVariantId} onValueChange={(v) => setSelectedVariantId(v ?? "")}>
                        <SelectTrigger><SelectValue placeholder="Select variant…" /></SelectTrigger>
                        <SelectContent>
                          {selectedProduct?.variants.filter((v) => v.size_label !== "").map((v) => (
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
                    <Input type="number" placeholder="e.g. +10 or -3" value={qtyChange}
                      onChange={(e) => setQtyChange(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">Positive to add stock, negative to reduce.</p>
                  </div>

                  <div className="space-y-1">
                    <Label>Note</Label>
                    <Input placeholder="Reason for adjustment…" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>

                  <Button type="submit" className="w-full"
                    disabled={saving || !selectedProductId || !selectedVariantId}>
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
                            {a.variant && (a.variant as { size_label: string }).size_label && ` (${(a.variant as { size_label: string }).size_label})`}
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

      {/* Search */}
      <Input
        placeholder="Search products…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Product list */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const realVariants = hasRealVariants(p);
            const totalStock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
            const isOutOfStock = p.track_stock && p.variants.every((v) => v.stock_qty === 0);
            const defVariant = p.variants.find(isDefaultVariant);
            return (
              <div key={p.id} className="bg-card border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{p.name}</p>
                      {p.is_fish && <Badge variant="outline" className="text-[10px]">Fish</Badge>}
                      {p.category?.name && (
                        <Badge variant="secondary" className="text-[10px]">{p.category.name}</Badge>
                      )}
                    </div>

                    {realVariants ? (
                      <div className="mt-1 space-y-0.5">
                        {p.variants.filter((v) => v.size_label !== "").map((v) => (
                          <div key={v.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{v.size_label} · {formatCurrency(v.price)}</span>
                            {p.track_stock && getStockBadge(v.stock_qty, v.low_stock_threshold)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-medium">{formatCurrency(defVariant?.price ?? 0)}</p>
                        {p.track_stock && defVariant && getStockBadge(defVariant.stock_qty, defVariant.low_stock_threshold)}
                      </div>
                    )}
                  </div>

                  {/* Add to cart button */}
                  <Button
                    size="sm"
                    variant={isOutOfStock ? "outline" : "default"}
                    disabled={isOutOfStock}
                    onClick={() => openCartDialog(p)}
                    className="flex-shrink-0"
                  >
                    {isOutOfStock ? "Out" : "+ Cart"}
                  </Button>

                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search ? "No products match your search" : "No products yet"}
            </p>
          )}
        </div>
      )}

      {/* Add to Cart Dialog */}
      <Dialog open={!!cartDialog} onOpenChange={(open) => { if (!open) { setCartDialog(null); setCartVariant(null); setCartQty("1"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cartDialog?.name}
              {cartVariant && cartVariant.size_label && <span className="text-muted-foreground font-normal"> — {cartVariant.size_label}</span>}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Variant selection (only for products with real variants) */}
          {cartDialogHasRealVariants && !cartVariant && (
            <div className="space-y-2 mt-2">
              <p className="text-sm text-muted-foreground">Select size:</p>
              {cartDialog?.variants.filter((v) => v.size_label !== "").map((v) => {
                const outOfStock = cartDialog.track_stock && v.stock_qty === 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => setCartVariant(v)}
                    disabled={outOfStock}
                    className="w-full flex justify-between items-center p-3 border rounded-xl text-left disabled:opacity-50 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <span className="font-medium">{v.size_label}</span>
                    <span className="text-right">
                      <span className="font-bold">{formatCurrency(v.price)}</span>
                      {cartDialog.track_stock && <span className="text-xs text-muted-foreground ml-2">stock: {v.stock_qty}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Qty input */}
          {showQtyStep && cartVariant && (
            <div className="space-y-4 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold">{formatCurrency(cartVariant.price)}</span>
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline"
                    onClick={() => setCartQty((q) => String(Math.max(0.1, parseFloat(q) - 1)))}>−</Button>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={cartQty}
                    onChange={(e) => setCartQty(e.target.value)}
                    className="text-center"
                  />
                  <Button type="button" size="icon" variant="outline"
                    onClick={() => setCartQty((q) => String(parseFloat(q) + 1))}>+</Button>
                </div>
              </div>
              <Button className="w-full" onClick={confirmAddToCart}>
                Add to Cart · {formatCurrency(cartVariant.price * (parseFloat(cartQty) || 1))}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
