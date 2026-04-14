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
  const [categoryInput, setCategoryInput] = useState(product?.category?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? null as string | null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);
  // For single products, read price/stock from default variant
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? true);
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState((product?.low_stock_threshold ?? 5) > 0);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.low_stock_threshold?.toString() ?? "5");
  // All variants including blank-label (default). New products auto-start with one blank row.
  const [variants, setVariants] = useState<(Partial<ProductVariant> & { tempId: string })[]>(() => {
    if (product) {
      return (product.variants ?? []).map((v) => ({ ...v, tempId: v.id }));
    }
    return [{ tempId: "default-new", size_label: "", price: 0, stock_qty: 0, low_stock_threshold: 5 }];
  });
  const [saving, setSaving] = useState(false);

  // Track original stock for edit mode — diffs → adjustment logs
  const [originalStockMap] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    (product?.variants ?? []).forEach((v) => map.set(v.id, v.stock_qty));
    return map;
  });
  const [adjustNote, setAdjustNote] = useState("");

  const hasStockChanges = isEdit && variants.some((v) => {
    if (!v.id) return false;
    const original = originalStockMap.get(v.id);
    return original !== undefined && Number(v.stock_qty ?? 0) !== original;
  });

  const namedVariants = variants.filter((v) => (v.size_label ?? "") !== "");
  const hasVariants = namedVariants.length > 0;

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
      const blankVariant = variants.find((v) => (v.size_label ?? "") === "");
      const threshold = lowStockAlertEnabled ? (Number(lowStockThreshold) || 5) : 0;

      // Save product — pass blank variant's price/stock for default variant creation/update
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: name.trim(),
          category_id: categoryId,
          track_stock: trackStock,
          price: blankVariant ? Number(blankVariant.price ?? 0) : null,
          stock_qty: blankVariant ? (trackStock ? Number(blankVariant.stock_qty ?? 0) : 0) : null,
          low_stock_threshold: threshold,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Save failed");

      const productId = data.id ?? product!.id;

      // For edit: directly PUT blank variant if it has an existing id
      if (isEdit && blankVariant?.id) {
        await apiFetch(`/api/products/${productId}/variants/${blankVariant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            size_label: "",
            price: Number(blankVariant.price ?? 0),
            low_stock_threshold: threshold,
          }),
        });
      }

      // Named variants (size_label != '')
      if (hasVariants) {
        const existingNamed = (product?.variants ?? []).filter((v) => v.size_label !== "");
        const existingIds = new Set(existingNamed.map((v) => v.id));
        for (const v of namedVariants) {
          const isNew = !existingIds.has(v.id ?? "");
          const varThreshold = lowStockAlertEnabled ? (v.low_stock_threshold ?? 5) : 0;
          if (isNew) {
            await apiFetch(`/api/products/${productId}/variants`, {
              method: "POST",
              body: JSON.stringify({ size_label: v.size_label, price: v.price, stock_qty: v.stock_qty, low_stock_threshold: varThreshold }),
            });
          } else {
            // Edit mode: exclude stock_qty from PUT — stock changes go through /api/stock/adjust
            const varBody: Record<string, unknown> = { size_label: v.size_label, price: v.price, low_stock_threshold: varThreshold };
            if (!isEdit) varBody.stock_qty = v.stock_qty;
            await apiFetch(`/api/products/${productId}/variants/${v.id}`, {
              method: "PUT",
              body: JSON.stringify(varBody),
            });
          }
        }

        // Delete removed named variants
        const removedIds = existingNamed.filter((v) => !namedVariants.find((nv) => nv.id === v.id)).map((v) => v.id);
        for (const vid of removedIds) {
          await apiFetch(`/api/products/${productId}/variants/${vid}`, { method: "DELETE" });
        }
      }

      // Stock adjustments — edit mode only, for existing variants with changed stock
      if (isEdit) {
        for (const v of variants) {
          if (!v.id) continue;
          const original = originalStockMap.get(v.id);
          const newQty = Number(v.stock_qty ?? 0);
          if (original !== undefined && newQty !== original) {
            await apiFetch("/api/stock/adjust", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_id: productId,
                variant_id: v.id,
                qty_change: newQty - original,
                note: adjustNote.trim() || null,
              }),
            });
          }
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

      {/* Track stock toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="track_stock" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="h-4 w-4" />
        <Label htmlFor="track_stock">Track stock quantity</Label>
        {!trackStock && <span className="text-xs text-muted-foreground">Stock won&apos;t be counted or enforced</span>}
      </div>

      {trackStock && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="low_stock_alert" checked={lowStockAlertEnabled} onChange={(e) => setLowStockAlertEnabled(e.target.checked)} className="h-4 w-4" />
          <Label htmlFor="low_stock_alert">Low stock alert</Label>
          {!lowStockAlertEnabled && <span className="text-xs text-muted-foreground">No alert when stock runs low</span>}
        </div>
      )}

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
              <Badge variant="secondary">{v.size_label || "—"}</Badge>
              <Button type="button" size="sm" variant="ghost" className="text-red-500 h-7"
                onClick={() => removeVariant(v.tempId!)}>Remove</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Size Label <span className="text-muted-foreground">(optional)</span></Label>
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
              {trackStock && lowStockAlertEnabled && (
                <div className="space-y-1">
                  <Label className="text-xs">Low Stock Alert</Label>
                  <Input type="number" placeholder="5" value={v.low_stock_threshold ?? ""}
                    onChange={(e) => updateVariant(v.tempId!, "low_stock_threshold", Number(e.target.value))} />
                </div>
              )}
            </div>
          </div>
        ))}

      </div>

      {hasStockChanges && (
        <div className="space-y-1">
          <Label>Stock Adjustment Note</Label>
          <Input placeholder="Reason for stock change…" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
        </Button>
        {isEdit && (
          <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
        )}
      </div>
      <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>Cancel</Button>
    </form>
  );
}
