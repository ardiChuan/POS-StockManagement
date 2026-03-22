"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadExpenses() {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(data.data ?? []);
    setTotal(data.data?.reduce((s: number, e: Expense) => s + Number(e.amount), 0) ?? 0);
    setLoading(false);
  }

  useEffect(() => { loadExpenses(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Failed to save expense");
      setDescription("");
      setAmount("");
      toast.success("Expense recorded");
      loadExpenses();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl">Expenses</h1>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm">Record Expense</p>
        <div className="space-y-1">
          <Label>Description *</Label>
          <Input placeholder="e.g. Electricity bill" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Amount (Rp) *</Label>
          <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Record Expense"}
        </Button>
      </form>

      <Separator />

      <div className="flex justify-between items-center">
        <p className="font-semibold">All Expenses</p>
        <p className="font-bold text-red-600">{formatCurrency(total)}</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="bg-white border rounded-xl p-3 flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">{exp.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(exp.created_at)}</p>
              </div>
              <p className="font-bold text-red-600 flex-shrink-0 ml-2">{formatCurrency(Number(exp.amount))}</p>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-center text-muted-foreground py-4">No expenses yet</p>}
        </div>
      )}
    </div>
  );
}
