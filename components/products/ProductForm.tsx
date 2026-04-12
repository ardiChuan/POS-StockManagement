"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Product, ProductVariant, Category } from "@/types";

interface ProductFormProps {
  product?: Product & { variants: ProductVariant[]; category: Category | null };
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [isFish, setIsFish] = useState(product?.is_fish ?? false);
  const [categoryInput, setCategoryInput] = useState(product?.category?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? null as string | null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);
  // For single products, read price/stock from default variant
  const defaultVariant = (product?.variants ?? []).find((v) => v.size_label === "");
  const [price, setPrice] = useState(
    defaultVariant ? defaultVariant.price.toString() : (product?.price?.toString() ?? "")
  );
  const [stockQty, setStockQty] = useState(
    defaultVariant ? defaultVariant.stock_qty.toString() : (product?.stock_qty?.toString() ?? "")
  );
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? true);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.low_stock_threshold?.toString() ?? "5");
  // Filter out default variant (size_label = '') — those are managed implicitly
  const [variants, setVariants] = useState<(Partial<ProductVariant> & { tempId: string })[]>(
    (product?.variants ?? []).filter((v) => v.size_label !== "").map((v) => ({ ...v, tempId: v.id }))
  );
  const [saving, setSaving] = useState(false);

  const hasVariants = variants.length > 0;

  useEffect(() => {
    apiFetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  const filteredCats = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryInput.toLowerCase())
  );

  async function handleCategorySelect(cat: Category | null) {
    if (cat) {
      setCategoryId(cat.id);
      setCategoryInput(cat.name);
    } else {
      // Create new category
      if (!categoryInput.trim()) return;
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryInput.trim() }),
      });
      const data = await res.json();
      setCategoryId(data.id);
      setCategories((prev) => [...prev, data]);
    }
    setShowCatSuggestions(false);
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { tempId: `new-${Date.now()}`, size_label: "", price: 0, stock_qty: 0, low_stock_threshold: 5 },
    ]);
  }

  function removeVariant(tempId: string) {
    setVariants((prev) => prev.filter((v) => v.tempId !== tempId));
  }

  function updateVariant(tempId: string, field: string, value: string | number) {
    setVariants((prev) => prev.map((v) => v.tempId === tempId ? { ...v, [field]: value } : v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");

    setSaving(true);
    try {
      // Save product
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: name.trim(),
          category_id: categoryId,
          is_fish: isFish,
          track_stock: trackStock,
          // For single products (no user variants), pass price/stock so API can update default variant
          price: hasVariants ? null : (price ? Number(price) : 0),
          stock_qty: hasVariants ? null : (trackStock ? (stockQty ? Number(stockQty) : 0) : 0),
          low_stock_threshold: Number(lowStockThreshold) || 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Save failed");

      const productId = data.id ?? product!.id;

      // Save user-created variants (only if user added size variants)
      if (hasVariants) {
        const existingVariants = (product?.variants ?? []).filter((v) => v.size_label !== "");
        const existingIds = new Set(existingVariants.map((v) => v.id));
        for (const v of variants) {
          const isNew = !existingIds.has(v.id ?? "");
          if (isNew) {
            await apiFetch(`/api/products/${productId}/variants`, {
              method: "POST",
              body: JSON.stringify({ size_label: v.size_label, price: v.price, stock_qty: v.stock_qty, low_stock_threshold: v.low_stock_threshold }),
            });
          } else {
            await apiFetch(`/api/products/${productId}/variants/${v.id}`, {
              method: "PUT",
              body: JSON.stringify({ size_label: v.size_label, price: v.price, stock_qty: v.stock_qty, low_stock_threshold: v.low_stock_threshold }),
            });
          }
        }

        // Delete removed variants
        const removedIds = existingVariants.filter((v) => !variants.find((nv) => nv.id === v.id)).map((v) => v.id);
        for (const vid of removedIds) {
          await apiFetch(`/api/products/${productId}/variants/${vid}`, { method: "DELETE" });
        }
      }

      toast.success(isEdit ? "Product updated" : "Product added");
      router.push("/products");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product || !confirm("Delete this product?")) return;
    const res = await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed");
    toast.success("Product deleted");
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Name *</Label>
        <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      {/* Category */}
      <div className="space-y-1 relative">
        <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder="Search or create category…"
          value={categoryInput}
          onChange={(e) => { setCategoryInput(e.target.value); setCategoryId(null); setShowCatSuggestions(true); }}
          onFocus={() => setShowCatSuggestions(true)}
          onBlur={() => setTimeout(() => setShowCatSuggestions(false), 150)}
        />
        {showCatSuggestions && (categoryInput || filteredCats.length > 0) && (
          <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-xl shadow-lg mt-1 overflow-hidden max-h-40 overflow-y-auto">
            {filteredCats.map((c) => (
              <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                onMouseDown={() => handleCategorySelect(c)}>{c.name}</button>
            ))}
            {categoryInput.trim() && !filteredCats.find((c) => c.name.toLowerCase() === categoryInput.toLowerCase()) && (
              <button type="button" className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-zinc-50"
                onMouseDown={() => handleCategorySelect(null)}>
                Create &ldquo;{categoryInput.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_fish" checked={isFish} onChange={(e) => setIsFish(e.target.checked)} className="h-4 w-4" />
        <Label htmlFor="is_fish">This is a fish product (stock-based)</Label>
      </div>

      {/* Track stock toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="track_stock" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="h-4 w-4" />
        <Label htmlFor="track_stock">Track stock quantity</Label>
        {!trackStock && <span className="text-xs text-muted-foreground">Stock won&apos;t be counted or enforced</span>}
      </div>

      <Separator />

      {/* Variants section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sizes / Variants</Label>
          <Button type="button" size="sm" variant="outline" onClick={addVariant}>+ Add Size</Button>
        </div>

        {variants.map((v) => (
          <div key={v.tempId} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{v.size_label || "New Size"}</Badge>
              <Button type="button" size="sm" variant="ghost" className="text-red-500 h-7"
                onClick={() => removeVariant(v.tempId!)}>Remove</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Size Label *</Label>
                <Input placeholder="e.g. 500g, Large" value={v.size_label ?? ""}
                  onChange={(e) => updateVariant(v.tempId!, "size_label", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price (Rp) *</Label>
                <Input type="number" placeholder="0" value={v.price ?? ""}
                  onChange={(e) => updateVariant(v.tempId!, "price", Number(e.target.value))} />
              </div>
              {trackStock && (
                <div className="space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" placeholder="0" value={v.stock_qty ?? ""}
                    onChange={(e) => updateVariant(v.tempId!, "stock_qty", Number(e.target.value))} />
                </div>
              )}
              {trackStock && (
                <div className="space-y-1">
                  <Label className="text-xs">Low Stock Alert</Label>
                  <Input type="number" placeholder="5" value={v.low_stock_threshold ?? ""}
                    onChange={(e) => updateVariant(v.tempId!, "low_stock_threshold", Number(e.target.value))} />
                </div>
              )}
            </div>
          </div>
        ))}

        {variants.length === 0 && (
          <p className="text-xs text-muted-foreground">No variants — use the fields below for a single price/stock.</p>
        )}
      </div>

      {/* Single price/stock (shown only when no variants) */}
      {!hasVariants && (
        <>
          <Separator />
          <div className={trackStock ? "grid grid-cols-2 gap-3" : "space-y-1"}>
            <div className="space-y-1">
              <Label>Price (Rp)</Label>
              <Input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            {trackStock && (
              <div className="space-y-1">
                <Label>Stock</Label>
                <Input type="number" placeholder="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              </div>
            )}
          </div>
          {trackStock && (
            <div className="space-y-1">
              <Label>Low Stock Alert at</Label>
              <Input type="number" placeholder="5" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update Product" : "Add Product"}
        </Button>
        {isEdit && (
          <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
        )}
      </div>
      <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>Cancel</Button>
    </form>
  );
}
