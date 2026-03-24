"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { apiFetch } from "@/lib/api";
import { enqueueSale, flushQueue } from "@/lib/offline-queue";
import type { Fish, Product, ProductVariant, Customer, CartItem, DiscountType } from "@/types";

type ProductWithVariants = Product & { variants: ProductVariant[] };
const _cache: { fish: Fish[] | null; products: ProductWithVariants[] | null } = { fish: null, products: null };

export default function PosPage() {
  const router = useRouter();
  const cart = useCart();

  const [tab, setTab] = useState<"fish" | "products">("fish");
  const [search, setSearch] = useState("");
  const [fish, setFish] = useState<Fish[]>(_cache.fish ?? []);
  const [products, setProducts] = useState<ProductWithVariants[]>(_cache.products ?? []);
  const [loading, setLoading] = useState(_cache.fish === null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Variant picker
  const [variantProduct, setVariantProduct] = useState<(Product & { variants: ProductVariant[] }) | null>(null);

  // Customer dialog
  const [customerMode, setCustomerMode] = useState<"none" | "search" | "new">("none");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [fishRes, prodRes] = await Promise.all([
        apiFetch("/api/fish?status=available"),
        apiFetch("/api/products"),
      ]);
      const [fishData, prodData] = await Promise.all([fishRes.json(), prodRes.json()]);
      _cache.fish = fishData;
      _cache.products = prodData;
      setFish(fishData);
      setProducts(prodData);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (_cache.fish) {
      loadData(true); // already showing cached data, refresh in background
    } else {
      loadData();
    }
  }, [loadData]);

  // Flush offline queue when reconnecting
  useEffect(() => {
    const handleOnline = () => {
      flushQueue(
        (_localId, _saleId) => toast.success("Offline sale synced"),
        (_localId, err) => toast.error(`Sync failed: ${err}`),
      );
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Customer search
  useEffect(() => {
    if (customerMode !== "search" || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`);
      setCustomerResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, customerMode]);

  const filteredFish = fish.filter((f) =>
    !search || f.fish_display_id.toLowerCase().includes(search.toLowerCase()) ||
    f.size_label?.toLowerCase().includes(search.toLowerCase()) ||
    f.tank_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  function addFishToCart(f: Fish) {
    const item: CartItem = {
      key: `fish-${f.id}`,
      item_type: "fish",
      fish_id: f.id,
      description: `${f.fish_display_id}${f.size_label ? ` (${f.size_label})` : ""}`,
      unit_price: f.price,
      qty: 1,
    };
    cart.addItem(item);
    toast.success(`${f.fish_display_id} added to cart`);
  }

  function addProductToCart(p: Product & { variants: ProductVariant[] }, variant?: ProductVariant) {
    if (p.variants.length > 0 && !variant) {
      setVariantProduct(p);
      return;
    }
    const v = variant;
    const item: CartItem = {
      key: v ? `product-${p.id}-${v.id}` : `product-${p.id}`,
      item_type: "product",
      product_id: p.id,
      variant_id: v?.id,
      description: v ? `${p.name} (${v.size_label})` : p.name,
      unit_price: v ? v.price : (p.price ?? 0),
      qty: 1,
    };
    cart.addItem(item);
    setVariantProduct(null);
    toast.success(`${item.description} added to cart`);
  }

  async function handleCheckout() {
    if (!cart.items.length) return;
    setCheckingOut(true);

    const payload = {
      items: cart.items.map((i) => ({
        item_type: i.item_type,
        fish_id: i.fish_id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        description: i.description,
        unit_price: i.unit_price,
        qty: i.qty,
      })),
      customer_id: cart.customer_id,
      customer_name: !cart.customer_id && cart.customer_name ? cart.customer_name : undefined,
      customer_phone: !cart.customer_id && cart.customer_phone ? cart.customer_phone : undefined,
      discount_type: cart.discount_type,
      discount_value: cart.discount_value,
      payment_method: cart.payment_method,
      notes: cart.notes,
    };

    // Offline: only cash sales can be queued
    if (!navigator.onLine) {
      if (cart.payment_method !== "cash") {
        toast.error("Transfer payments require an internet connection");
        setCheckingOut(false);
        return;
      }
      if (cart.items.some((i) => i.item_type === "fish")) {
        toast.error("Individual fish sales require an internet connection (availability check needed)");
        setCheckingOut(false);
        return;
      }
      await enqueueSale(payload);
      cart.clear();
      setCartOpen(false);
      toast.success("Sale saved offline — will sync when reconnected");
      setCheckingOut(false);
      return;
    }

    try {
      const res = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Checkout failed");

      cart.clear();
      setCartOpen(false);
      router.push(`/pos/receipt/${data.id}`);
    } catch {
      toast.error("Network error — try again");
    } finally {
      setCheckingOut(false);
    }
  }

  const cartCount = cart.items.length;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="p-3 border-b bg-white sticky top-0 z-10 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger className="relative inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent">
              Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {cartCount}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Cart</SheetTitle>
              </SheetHeader>
              <CartPanel cart={cart} onCheckout={handleCheckout} checkingOut={checkingOut}
                customerMode={customerMode} setCustomerMode={setCustomerMode}
                customerQuery={customerQuery} setCustomerQuery={setCustomerQuery}
                customerResults={customerResults}
                newCustomerName={newCustomerName} setNewCustomerName={setNewCustomerName}
                newCustomerPhone={newCustomerPhone} setNewCustomerPhone={setNewCustomerPhone}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={tab === "fish" ? "default" : "outline"} onClick={() => setTab("fish")} className="flex-1">
            🐟 Fish
          </Button>
          <Button size="sm" variant={tab === "products" ? "default" : "outline"} onClick={() => setTab("products")} className="flex-1">
            📦 Products
          </Button>
        </div>
      </div>

      {/* Item Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-muted-foreground text-center mt-8">Loading…</p>
        ) : tab === "fish" ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredFish.map((f) => (
              <button
                key={f.id}
                onClick={() => addFishToCart(f)}
                className="bg-white border rounded-xl p-3 text-left active:scale-95 transition-transform shadow-sm"
              >
                {f.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.photo_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                )}
                <p className="font-semibold text-sm">{f.fish_display_id}</p>
                <p className="text-xs text-muted-foreground">{f.tank_id}{f.size_label ? ` · ${f.size_label}` : ""}</p>
                <p className="font-bold mt-1">{formatCurrency(f.price)}</p>
              </button>
            ))}
            {!filteredFish.length && <p className="col-span-2 text-center text-muted-foreground mt-8">No fish available</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.filter(p => !p.is_fish).concat(filteredProducts.filter(p => p.is_fish)).map((p) => {
              const stockQty = p.variants.length ? p.variants.reduce((s, v) => s + v.stock_qty, 0) : (p.stock_qty ?? 0);
              const isOutOfStock = stockQty === 0;
              return (
                <button
                  key={p.id}
                  onClick={() => !isOutOfStock && addProductToCart(p)}
                  disabled={isOutOfStock}
                  className="bg-white border rounded-xl p-3 text-left active:scale-95 transition-transform shadow-sm disabled:opacity-50"
                >
                  <p className="font-semibold text-sm leading-tight">{p.name}</p>
                  {p.variants.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{p.variants.length} sizes</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Stock: {stockQty}</p>
                  )}
                  <p className="font-bold mt-1 text-sm">
                    {p.variants.length > 0
                      ? `${formatCurrency(Math.min(...p.variants.map(v => v.price)))}+`
                      : formatCurrency(p.price ?? 0)}
                  </p>
                  {isOutOfStock && <Badge variant="destructive" className="text-[10px] mt-1">Out of stock</Badge>}
                </button>
              );
            })}
            {!filteredProducts.length && <p className="col-span-2 text-center text-muted-foreground mt-8">No products found</p>}
          </div>
        )}
      </div>

      {/* Variant Picker */}
      <Dialog open={!!variantProduct} onOpenChange={() => setVariantProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{variantProduct?.name} — Select Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {variantProduct?.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => addProductToCart(variantProduct!, v)}
                disabled={v.stock_qty === 0}
                className="w-full flex justify-between items-center p-3 border rounded-xl text-left disabled:opacity-50 active:bg-zinc-50"
              >
                <span className="font-medium">{v.size_label}</span>
                <span className="text-right">
                  <span className="font-bold">{formatCurrency(v.price)}</span>
                  <span className="text-xs text-muted-foreground ml-2">stock: {v.stock_qty}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Cart Panel (inside bottom sheet) ─────────────────────────────────────────
function CartPanel({
  cart, onCheckout, checkingOut,
  customerMode, setCustomerMode,
  customerQuery, setCustomerQuery, customerResults,
  newCustomerName, setNewCustomerName,
  newCustomerPhone, setNewCustomerPhone,
}: {
  cart: ReturnType<typeof useCart>;
  onCheckout: () => void;
  checkingOut: boolean;
  customerMode: "none" | "search" | "new";
  setCustomerMode: (m: "none" | "search" | "new") => void;
  customerQuery: string;
  setCustomerQuery: (q: string) => void;
  customerResults: Customer[];
  newCustomerName: string;
  setNewCustomerName: (v: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-4 pb-4">
      {/* Items */}
      {cart.items.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">Cart is empty</p>
      ) : (
        <div className="space-y-2">
          {cart.items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 bg-zinc-50 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</p>
              </div>
              {item.item_type !== "fish" && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7 text-xs"
                    onClick={() => cart.setQty(item.key, item.qty - 1)}>−</Button>
                  <span className="w-6 text-center text-sm">{item.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7 text-xs"
                    onClick={() => cart.setQty(item.key, item.qty + 1)}>+</Button>
                </div>
              )}
              <p className="text-sm font-bold w-20 text-right">{formatCurrency(item.unit_price * item.qty)}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                onClick={() => cart.removeItem(item.key)}>×</Button>
            </div>
          ))}
        </div>
      )}

      {/* Customer */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Customer</p>
        {cart.customer_name ? (
          <div className="flex items-center gap-2 bg-zinc-50 rounded-lg p-2">
            <div className="flex-1">
              <p className="text-sm font-medium">{cart.customer_name}</p>
              {cart.customer_phone && <p className="text-xs text-muted-foreground">{cart.customer_phone}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => { cart.setCustomer(null, "", ""); setCustomerMode("none"); }}>Clear</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setCustomerMode("search")}>Search</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setCustomerMode("new")}>Add New</Button>
            <Button size="sm" variant="ghost" onClick={() => setCustomerMode("none")}>Skip</Button>
          </div>
        )}

        {customerMode === "search" && !cart.customer_name && (
          <div className="space-y-1">
            <Input placeholder="Name or phone…" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
            {customerResults.map((c) => (
              <button key={c.id} className="w-full text-left p-2 rounded-lg bg-zinc-50 text-sm"
                onClick={() => { cart.setCustomer(c.id, c.name, c.phone ?? ""); setCustomerMode("none"); setCustomerQuery(""); }}>
                {c.name} {c.phone && <span className="text-muted-foreground">· {c.phone}</span>}
              </button>
            ))}
          </div>
        )}

        {customerMode === "new" && !cart.customer_name && (
          <div className="space-y-2">
            <Input placeholder="Name *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
            <Input placeholder="Phone (optional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
            <Button size="sm" className="w-full" onClick={() => {
              if (!newCustomerName.trim()) return;
              cart.setCustomer(null, newCustomerName.trim(), newCustomerPhone.trim());
              setCustomerMode("none");
              setNewCustomerName("");
              setNewCustomerPhone("");
            }}>Confirm</Button>
          </div>
        )}
      </div>

      {/* Discount */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Discount</p>
        <div className="flex gap-2">
          <Select value={cart.discount_type ?? "none"}
            onValueChange={(v) => cart.setDiscount(v === "none" ? null : v as DiscountType, cart.discount_value)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="flat">Flat (Rp)</SelectItem>
              <SelectItem value="percent">% Off</SelectItem>
            </SelectContent>
          </Select>
          {cart.discount_type && (
            <Input
              type="number"
              placeholder={cart.discount_type === "percent" ? "%" : "Amount"}
              value={cart.discount_value || ""}
              onChange={(e) => cart.setDiscount(cart.discount_type, Number(e.target.value))}
              className="flex-1"
            />
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Payment</p>
        <div className="flex gap-2">
          <Button size="sm" variant={cart.payment_method === "cash" ? "default" : "outline"} className="flex-1"
            onClick={() => cart.setPayment("cash")}>💵 Cash</Button>
          <Button size="sm" variant={cart.payment_method === "bank_transfer" ? "default" : "outline"} className="flex-1"
            onClick={() => cart.setPayment("bank_transfer")}>🏦 Transfer</Button>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(cart.subtotal)}</span>
        </div>
        {cart.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Discount</span>
            <span>−{formatCurrency(cart.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t pt-1">
          <span>Total</span>
          <span>{formatCurrency(cart.total)}</span>
        </div>
      </div>

      <Button className="w-full h-12 text-base" onClick={onCheckout} disabled={checkingOut || cart.items.length === 0}>
        {checkingOut ? "Processing…" : `Complete Sale · ${formatCurrency(cart.total)}`}
      </Button>
    </div>
  );
}
