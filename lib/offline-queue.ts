import { openDB, type IDBPDatabase } from "idb";
import type { CreateSaleRequest } from "@/types";

const DB_NAME = "pos-offline";
const DB_VERSION = 1;
const STORE = "pending_sales";

export interface PendingSale {
  localId: string;
  payload: CreateSaleRequest;
  createdAt: string;
}

let _db: IDBPDatabase | null = null;

async function getDB() {
  if (!_db) {
    _db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "localId" });
        }
      },
    });
  }
  return _db;
}

export async function enqueueSale(payload: CreateSaleRequest): Promise<string> {
  const db = await getDB();
  const localId = `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entry: PendingSale = { localId, payload, createdAt: new Date().toISOString() };
  await db.put(STORE, entry);
  return localId;
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function deletePendingSale(localId: string) {
  const db = await getDB();
  await db.delete(STORE, localId);
}

export async function flushQueue(
  onSuccess: (localId: string, saleId: string) => void,
  onError: (localId: string, error: string) => void
) {
  const pending = await getPendingSales();
  for (const entry of pending) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (res.ok) {
        const data = await res.json();
        await deletePendingSale(entry.localId);
        onSuccess(entry.localId, data.id);
      } else {
        const data = await res.json();
        onError(entry.localId, data.error ?? "Sync failed");
      }
    } catch {
      onError(entry.localId, "Network error during sync");
    }
  }
}
