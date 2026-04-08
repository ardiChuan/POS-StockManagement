"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDateTime, todayDateString } from "@/lib/utils";
import type { Expense } from "@/types";

export default function ReportsExpensesPage() {
  const today = todayDateString();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch(`/api/reports/expenses?from=${from}&to=${to}`);
    const data = await res.json();
    setTotal(data.total ?? 0);
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-2xl tracking-tight">Expenses Report</h1>

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs invisible">Go</Label>
          <Button size="sm" onClick={load} disabled={loading}>Go</Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="font-semibold">Total</p>
        <p className="font-bold text-lg text-red-600">{formatCurrency(total)}</p>
      </div>

      <div className="space-y-2">
        {items.map((exp) => (
          <div key={exp.id} className="bg-card border rounded-xl p-3 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">{exp.description}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(exp.created_at)}</p>
            </div>
            <p className="font-bold text-red-600 flex-shrink-0 ml-2">{formatCurrency(Number(exp.amount))}</p>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-4">No expenses in this period</p>
        )}
      </div>
    </div>
  );
}
