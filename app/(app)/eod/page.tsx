"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface RegisterData {
  date: string;
  opening_balance: number;
  cash_sales_total: number;
  expenses_total: number;
  expected_cash: number;
  actual_cash: number | null;
  discrepancy: number | null;
  closed_at: string | null;
  is_closed: boolean;
}

export default function EodPage() {
  const [data, setData] = useState<RegisterData | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    const res = await fetch("/api/cash-register/today");
    setData(await res.json());
  }

  useEffect(() => { loadData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actualCash) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_cash: Number(actualCash), notes: notes.trim() || null }),
      });
      const result = await res.json();
      if (!res.ok) return toast.error(result.error ?? "Failed");
      toast.success("Cash count submitted");
      loadData();
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;

  const discrepancy = data.is_closed ? data.discrepancy : null;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl">Cash Count (EOD)</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today — {data.date}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Opening Balance</span>
            <span className="font-medium">{formatCurrency(data.opening_balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">+ Cash Sales</span>
            <span className="font-medium text-green-600">+{formatCurrency(data.cash_sales_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">− Expenses</span>
            <span className="font-medium text-red-600">−{formatCurrency(data.expenses_total)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Expected Cash</span>
            <span>{formatCurrency(data.expected_cash)}</span>
          </div>
          {data.is_closed && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Count</span>
                <span className="font-medium">{formatCurrency(data.actual_cash ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Discrepancy</span>
                <Badge variant={discrepancy === 0 ? "secondary" : "destructive"}>
                  {discrepancy === 0 ? "✓ Matched" : discrepancy! > 0 ? `+${formatCurrency(discrepancy!)} over` : `${formatCurrency(discrepancy!)} short`}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!data.is_closed && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-3">
          <p className="font-semibold text-sm">Submit Cash Count</p>
          <div className="space-y-1">
            <Label>Physical Cash Count (Rp) *</Label>
            <Input
              type="number"
              placeholder="Count the cash in the drawer"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              required
            />
          </div>
          {actualCash && (
            <div className="text-sm bg-zinc-50 rounded-lg p-2">
              <div className="flex justify-between">
                <span>Expected</span>
                <span>{formatCurrency(data.expected_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Counted</span>
                <span>{formatCurrency(Number(actualCash))}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1">
                <span>Difference</span>
                <span className={Number(actualCash) - data.expected_cash === 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(Number(actualCash) - data.expected_cash)}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Count"}
          </Button>
        </form>
      )}

      {data.is_closed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 text-center">
          ✓ Today&apos;s cash count has been submitted. Tomorrow&apos;s opening balance will be {formatCurrency(data.actual_cash ?? 0)}.
        </div>
      )}
    </div>
  );
}
