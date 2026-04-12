"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Building2, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { apiFetch } from "@/lib/api";
import { enqueueSale, flushQueue } from "@/lib/offline-queue";
import type { Customer, CartItem, DiscountType } from "@/types";

export default function PosPage() {
  const router = useRouter();
  const cart = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const [customerMode, setCustomerMode] = useState<"none" | "search" | "new">("none");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  useEffect(() => {
    const handleOnline = () => {
      flushQueue(
        () => toast.success("Offline sale synced"),
        (_id: string, err: string) => toast.error(`Sync failed: ${err}`),
      );
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

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

  async function handleCheckout() {
    if (!cart.items.length) return;
    setCheckingOut(true);

    const payload = {
      items: cart.items.map((i) => ({
        item_type: i.item_type,
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

    if (!navigator.onLine) {
      if (cart.payment_method !== "cash") {
        toast.error("Transfer payments require an internet connection");
        setCheckingOut(false);
        return;
      }
      await enqueueSale(payload);
      cart.clear();
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
      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed");
        return;
      }
      cart.clear();
      router.push(`/pos/receipt/${data.id}`);
    } catch {
      toast.error("Network error — try again");
    } finally {
      setCheckingOut(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto w-full flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3 p-4 text-center">
        <ShoppingBag size={48} className="text-muted-foreground" />
        <p className="text-lg font-semibold">Cart is empty</p>
        <p className="text-sm text-muted-foreground">Add items from the Stocks page</p>
        <Link href="/products">
          <Button>Browse Stocks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl">Checkout</h1>
          <p className="text-xs text-muted-foreground">{cart.items.length} item(s)</p>
        </div>
        <Link href="/products">
          <Button size="sm" variant="outline">+ Add More</Button>
        </Link>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">

          {/* Cart items */}
          <div className="space-y-2">
            {cart.items.map((item) => (
              <CartItemRow key={item.key} item={item} />
            ))}
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Customer</p>
            {cart.customer_name ? (
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{cart.customer_name}</p>
                  {cart.customer_phone && <p className="text-xs text-muted-foreground">{cart.customer_phone}</p>}
                </div>
                <Button size="sm" variant="ghost"
                  onClick={() => { cart.setCustomer(null, "", ""); setCustomerMode("none"); }}>Clear</Button>
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
                  <button key={c.id} className="w-full text-left p-2 rounded-lg bg-muted/50 text-sm cursor-pointer hover:bg-muted transition-colors"
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
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="flat">Flat (Rp)</SelectItem>
                  <SelectItem value="percent">% Off</SelectItem>
                </SelectContent>
              </Select>
              {cart.discount_type && (
                <Input type="number"
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
              <Button size="sm" variant={cart.payment_method === "cash" ? "default" : "outline"} className="flex-1 gap-1.5"
                onClick={() => cart.setPayment("cash")}><Banknote size={14} /> Cash</Button>
              <Button size="sm" variant={cart.payment_method === "bank_transfer" ? "default" : "outline"} className="flex-1 gap-1.5"
                onClick={() => cart.setPayment("bank_transfer")}><Building2 size={14} /> Transfer</Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Notes</p>
            <Input placeholder="Optional note…" value={cart.notes} onChange={(e) => cart.setNotes(e.target.value)} />
          </div>

          {/* Totals */}
          <div className="bg-muted rounded-xl p-3 space-y-1">
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

        </div>
      </div>

      {/* Sticky checkout button */}
      <div className="p-4 border-t bg-background">
        <Button className="w-full h-12 text-base" onClick={handleCheckout}
          disabled={checkingOut}>
          {checkingOut ? "Processing…" : `Complete Sale · ${formatCurrency(cart.total)}`}
        </Button>
      </div>
    </div>
  );
}

function CartItemRow({ item }: { item: CartItem }) {
  const cart = useCart();
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setPriceInput(item.unit_price.toString());
    setEditingPrice(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const val = Number(priceInput);
    if (!isNaN(val) && val >= 0) cart.setPrice(item.key, val);
    setEditingPrice(false);
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.description}</p>
        {item.category_name === "Pakan" ? (
          editingPrice ? (
            <input
              ref={inputRef}
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingPrice(false); }}
              className="text-xs border rounded px-1 py-0.5 w-28 mt-0.5"
            />
          ) : (
            <button onClick={startEdit} className="text-xs text-muted-foreground underline decoration-dashed underline-offset-2 text-left">
              {formatCurrency(item.unit_price)}
            </button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-9 w-9 text-base"
          onClick={() => cart.setQty(item.key, item.qty - 1)}>−</Button>
        <span className="w-6 text-center text-sm">{item.qty}</span>
        <Button size="icon" variant="outline" className="h-9 w-9 text-base"
          onClick={() => cart.setQty(item.key, item.qty + 1)}>+</Button>
      </div>
      <p className="text-sm font-bold w-20 text-right">{formatCurrency(item.unit_price * item.qty)}</p>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
        onClick={() => cart.removeItem(item.key)}>×</Button>
    </div>
  );
}
