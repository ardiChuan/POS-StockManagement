// ─── Store Config ────────────────────────────────────────────────────────────

export interface StoreConfig {
  id: number;
  store_name: string;
  access_code: string; // bcrypt hashed
  setup_complete: boolean;
  updated_at: string;
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  name: string;
  device_token: string;
  is_active: boolean;
  registered_at: string;
  last_seen_at: string | null;
}

// Device info returned to client (no token exposed)
export interface DeviceSession {
  id: string;
  name: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  is_fish: boolean;
  price: number | null;       // null when variants exist
  stock_qty: number | null;   // null when variants exist
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_label: string;
  price: number;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

// ─── Fish ─────────────────────────────────────────────────────────────────────

export type FishStatus = 'available' | 'sold';

export interface Fish {
  id: string;
  fish_display_id: string;
  tank_id: string;
  size_label: string | null;
  photo_url: string | null;
  price: number;
  status: FishStatus;
  notes: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'bank_transfer';
export type DiscountType = 'flat' | 'percent';

export interface Sale {
  id: string;
  sale_number: string;
  device_id: string | null;
  customer_id: string | null;
  discount_type: DiscountType | null;
  discount_value: number;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  // Joined
  device?: Device | null;
  customer?: Customer | null;
  items?: SaleItem[];
}

export type SaleItemType = 'fish' | 'product';

export interface SaleItem {
  id: string;
  sale_id: string;
  item_type: SaleItemType;
  fish_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  description: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

// ─── Cart (client-only) ───────────────────────────────────────────────────────

export interface CartItem {
  key: string; // unique key: fish_id or product_id+variant_id
  item_type: SaleItemType;
  fish_id?: string;
  product_id?: string;
  variant_id?: string;
  description: string;
  unit_price: number;
  qty: number;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  description: string;
  amount: number;
  device_id: string | null;
  created_at: string;
  // Joined
  device?: Device | null;
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export type AdjustmentType = 'manual' | 'sale' | 'refund';

export interface StockAdjustment {
  id: string;
  product_id: string;
  variant_id: string | null;
  adjustment_type: AdjustmentType;
  qty_before: number;
  qty_change: number;
  qty_after: number;
  note: string | null;
  device_id: string | null;
  related_sale_id: string | null;
  created_at: string;
  // Joined
  product?: Product | null;
  variant?: ProductVariant | null;
}

// ─── Cash Register ────────────────────────────────────────────────────────────

export interface CashRegister {
  id: string;
  date: string; // YYYY-MM-DD
  opening_balance: number;
  expected_cash: number | null;
  actual_cash: number | null;
  discrepancy: number | null;
  notes: string | null;
  closed_by_device_id: string | null;
  closed_at: string | null;
  created_at: string;
}

// ─── API Request / Response types ────────────────────────────────────────────

export interface CreateSaleRequest {
  items: {
    item_type: SaleItemType;
    fish_id?: string;
    product_id?: string;
    variant_id?: string;
    description: string;
    unit_price: number;
    qty: number;
  }[];
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  discount_type?: DiscountType | null;
  discount_value?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface StockAlertItem {
  id: string;
  name: string;
  size_label?: string;
  stock_qty: number;
  low_stock_threshold: number;
  is_fish: boolean;
  is_out_of_stock: boolean;
}
