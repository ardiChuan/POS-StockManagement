"use client";
import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDateTime, todayDateString, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaleItem {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface SaleRow {
  id: string;
  sale_number: string;
  total: number;
  payment_method: string;
  discount_type: string | null;
  discount_value: number | null;
  created_at: string;
  customer: { name: string } | null;
  items: SaleItem[];
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  device: { name: string } | null;
}

interface AdjustmentRow {
  id: string;
  qty_change: number;
  note: string | null;
  created_at: string;
  product: { name: string } | null;
  variant: { size_label: string } | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = todayDateString();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [salesSearch, setSalesSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "bank_transfer">("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const fromISO = `${from}T00:00:00.000Z`;
    const toISO   = `${to}T23:59:59.999Z`;
    try {
      const [salesRes, expRes, adjRes] = await Promise.all([
        apiFetch(`/api/sales?from=${fromISO}&to=${toISO}&limit=200`).then(r => r.json()),
        apiFetch(`/api/reports/expenses?from=${from}&to=${to}`).then(r => r.json()),
        apiFetch(`/api/stock/adjustments?from=${from}&to=${to}`).then(r => r.json()),
      ]);
      setSales(salesRes.data ?? []);
      setExpenses(expRes.items ?? []);
      setAdjustments(Array.isArray(adjRes) ? adjRes : []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredSales = sales.filter(s => {
    const nameMatch = !salesSearch || (s.customer?.name ?? "").toLowerCase().includes(salesSearch.toLowerCase());
    const payMatch  = paymentFilter === "all" || s.payment_method === paymentFilter;
    return nameMatch && payMatch;
  });

  const filteredExpenses = expenses.filter(e =>
    !expenseSearch || e.description.toLowerCase().includes(expenseSearch.toLowerCase())
  );

  const filteredAdjustments = adjustments.filter(a =>
    !stockSearch || (a.product?.name ?? "").toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-bold text-2xl tracking-tight">Reports</h1>
      </div>

      <Tabs defaultValue="sales" className="flex flex-col flex-1 min-h-0">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="sales" className="flex-1">Sales</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
            <TabsTrigger value="stock" className="flex-1">Stock Adj.</TabsTrigger>
          </TabsList>
        </div>

        {/* Shared date filter */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs invisible">Go</Label>
              <Button size="sm" onClick={loadAll} disabled={loading}>Go</Button>
            </div>
          </div>
        </div>

        {/* Sales tab */}
        <TabsContent value="sales" className="flex-1 overflow-y-auto px-4 pb-4 mt-0 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search customer…"
              value={salesSearch}
              onChange={e => setSalesSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={paymentFilter} onValueChange={v => setPaymentFilter(v as typeof paymentFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && <LoadingSkeleton />}
          {!loading && filteredSales.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No sales in this period</p>
          )}
          {filteredSales.map(sale => (
            <SaleCard
              key={sale.id}
              sale={sale}
              expanded={expandedSaleId === sale.id}
              onToggle={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
            />
          ))}
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses" className="flex-1 overflow-y-auto px-4 pb-4 mt-0 space-y-2">
          <Input
            placeholder="Search description…"
            value={expenseSearch}
            onChange={e => setExpenseSearch(e.target.value)}
          />

          {loading && <LoadingSkeleton />}
          {!loading && filteredExpenses.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No expenses in this period</p>
          )}
          {filteredExpenses.map(exp => (
            <div key={exp.id} className="bg-card border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{exp.description}</p>
                <p className="font-bold text-red-600 flex-shrink-0">{formatCurrency(Number(exp.amount))}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(exp.created_at)}
                {exp.device?.name && <span className="ml-2">· {exp.device.name}</span>}
              </p>
            </div>
          ))}
        </TabsContent>

        {/* Stock Adjustments tab */}
        <TabsContent value="stock" className="flex-1 overflow-y-auto px-4 pb-4 mt-0 space-y-2">
          <Input
            placeholder="Search product…"
            value={stockSearch}
            onChange={e => setStockSearch(e.target.value)}
          />

          {loading && <LoadingSkeleton />}
          {!loading && filteredAdjustments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No adjustments in this period</p>
          )}
          {filteredAdjustments.map(adj => (
            <div key={adj.id} className="bg-card border rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-bold text-base w-10 flex-shrink-0 text-right",
                  adj.qty_change > 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {adj.qty_change > 0 ? `+${adj.qty_change}` : adj.qty_change}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {adj.product?.name ?? "—"}
                    {adj.variant?.size_label && (
                      <span className="text-muted-foreground font-normal"> ({adj.variant.size_label})</span>
                    )}
                  </p>
                  {adj.note && <p className="text-xs text-muted-foreground truncate">{adj.note}</p>}
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">{formatDateTime(adj.created_at)}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sale card with expandable detail ─────────────────────────────────────────

function SaleCard({ sale, expanded, onToggle }: {
  sale: SaleRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const subtotal = sale.items.reduce((s, i) => s + i.line_total, 0);
  const discountAmount = sale.discount_type === "percent"
    ? (subtotal * (sale.discount_value ?? 0)) / 100
    : (sale.discount_value ?? 0);

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-2 text-left cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold truncate">
              {sale.customer?.name ?? "Walk-in"}
            </p>
            <Badge
              variant={sale.payment_method === "cash" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {sale.payment_method === "cash" ? "Cash" : "Transfer"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{sale.sale_number}</p>
        </div>
        <p className="font-bold text-sm flex-shrink-0">{formatCurrency(Number(sale.total))}</p>
        {expanded
          ? <ChevronUp size={15} className="text-muted-foreground flex-shrink-0" />
          : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1.5 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">{formatDateTime(sale.created_at)}</p>

          {sale.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="flex-1 truncate text-muted-foreground">
                {item.description}
                <span className="text-foreground"> × {item.qty}</span>
              </span>
              <span className="font-medium flex-shrink-0 ml-2">{formatCurrency(item.line_total)}</span>
            </div>
          ))}

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600 border-t pt-1.5 mt-1">
              <span>Discount</span>
              <span>−{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1">
            <span>Total</span>
            <span>{formatCurrency(Number(sale.total))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-3 space-y-2 animate-pulse">
          <div className="flex justify-between">
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
