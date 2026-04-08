import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { supabase } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { TrendingUp, Wallet, ArrowLeftRight, TrendingDown, AlertTriangle, PackageX } from "lucide-react";

export const dynamic = "force-dynamic";

type CashRegisterRow = { opening_balance: number; discrepancy: number | null };
type ProductRow = { id: string; name: string; stock_qty: number | null; low_stock_threshold: number };
type VariantRow = { id: string; size_label: string; stock_qty: number; low_stock_threshold: number; product: { name: string } | null };
type SaleRow = { id: string; sale_number: string; total: number; payment_method: string; created_at: string; customer: { name: string } | null };
type TodaySaleRow = { total: number; payment_method: string };
type ExpenseRow = { amount: number };

export default async function DashboardPage() {
  const device = await getDeviceFromCookies();
  if (!device) redirect("/setup");

  const today = new Date().toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [cashRegRes, salesRes, expRes, recentRes, prodRes, varRes] = await Promise.all([
    supabase.from("cash_register").select("*").eq("date", today).single(),
    supabase.from("sales").select("total, payment_method").gte("created_at", todayStart).lte("created_at", todayEnd),
    supabase.from("expenses").select("amount").gte("created_at", todayStart).lte("created_at", todayEnd),
    supabase.from("sales").select("id, sale_number, total, payment_method, created_at, customer:customers(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("products").select("id, name, stock_qty, low_stock_threshold").eq("is_active", true).limit(100),
    supabase.from("product_variants").select("id, size_label, stock_qty, low_stock_threshold, product:products(id, name)").limit(200),
  ]);

  const cashRegister = cashRegRes.data as CashRegisterRow | null;
  const todaySales = salesRes.data as TodaySaleRow[] | null;
  const todayExpenses = expRes.data as ExpenseRow[] | null;
  const recentSales = recentRes.data as SaleRow[] | null;
  const lowStockProducts = prodRes.data as ProductRow[] | null;
  const lowStockVariants = varRes.data as VariantRow[] | null;

  const lowStockItems = [
    ...(lowStockProducts ?? []).filter((p) => p.stock_qty !== null && p.stock_qty <= p.low_stock_threshold).map((p) => ({
      id: p.id, name: p.name, stock_qty: p.stock_qty!, low_stock_threshold: p.low_stock_threshold,
    })),
    ...(lowStockVariants ?? []).filter((v) => v.stock_qty <= v.low_stock_threshold).map((v) => ({
      id: v.id, name: `${v.product?.name ?? "?"} (${v.size_label})`, stock_qty: v.stock_qty, low_stock_threshold: v.low_stock_threshold,
    })),
  ];

  const totalRevenue = todaySales?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const cashRevenue = todaySales?.filter((s) => s.payment_method === "cash").reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const transferRevenue = totalRevenue - cashRevenue;
  const expensesTotal = todayExpenses?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const openingBalance = cashRegister?.opening_balance ?? 0;
  const cashBalance = openingBalance + cashRevenue - expensesTotal;
  const hasDiscrepancy = cashRegister?.discrepancy != null && Math.abs(Number(cashRegister.discrepancy)) > 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>

      {hasDiscrepancy && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Cash discrepancy today: {formatCurrency(Math.abs(Number(cashRegister!.discrepancy)))}
          {Number(cashRegister!.discrepancy) < 0 ? " short" : " over"}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-emerald-500 overflow-hidden">
          <CardContent className="px-3 py-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-muted-foreground">Today&apos;s Revenue</p>
              <TrendingUp size={16} className="text-emerald-500 flex-shrink-0" strokeWidth={1.8} />
            </div>
            <p className="font-bold text-xl leading-tight">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{todaySales?.length ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500 overflow-hidden">
          <CardContent className="px-3 py-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-muted-foreground">Cash Balance</p>
              <Wallet size={16} className="text-sky-500 flex-shrink-0" strokeWidth={1.8} />
            </div>
            <p className="font-bold text-xl leading-tight">{formatCurrency(cashBalance)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Opening: {formatCurrency(openingBalance)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 overflow-hidden">
          <CardContent className="px-3 py-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-muted-foreground">Cash / Transfer</p>
              <ArrowLeftRight size={16} className="text-amber-500 flex-shrink-0" strokeWidth={1.8} />
            </div>
            <p className="font-bold text-lg leading-tight">{formatCurrency(cashRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(transferRevenue)} transfer</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 overflow-hidden">
          <CardContent className="px-3 py-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-muted-foreground">Expenses Today</p>
              <TrendingDown size={16} className="text-red-500 flex-shrink-0" strokeWidth={1.8} />
            </div>
            <p className="font-bold text-xl leading-tight text-red-600">{formatCurrency(expensesTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center gap-1.5">
              <PackageX size={15} className="text-amber-500" />
              <CardTitle className="text-sm">Low Stock</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {lowStockItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="truncate flex-1">{item.name}</span>
                <Badge variant={item.stock_qty === 0 ? "destructive" : "secondary"} className="ml-2 flex-shrink-0">
                  {item.stock_qty === 0 ? "Out" : `${item.stock_qty}`}
                </Badge>
              </div>
            ))}
            {lowStockItems.length > 6 && <p className="text-xs text-muted-foreground">+{lowStockItems.length - 6} more</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {(!recentSales || recentSales.length === 0) && <p className="text-sm text-muted-foreground">No transactions yet</p>}
          {recentSales?.map((s) => (
            <div key={s.id} className="flex justify-between items-center text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold">{s.sale_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDateTime(s.created_at)}{s.customer?.name && ` · ${s.customer.name}`}
                </p>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <p className="font-bold">{formatCurrency(Number(s.total))}</p>
                <Badge variant="outline" className="text-[10px]">{s.payment_method === "cash" ? "Cash" : "Transfer"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
