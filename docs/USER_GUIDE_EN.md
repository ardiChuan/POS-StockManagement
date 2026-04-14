# Arowana POS — User Guide

## 1. Getting Started

### First-Time Setup
1. Open the app in your browser.
2. Enter your name (this identifies your device/cashier).
3. Enter the store access code provided by the store owner.
4. Tap **Set Up Store** (first device) or **Register Device** (additional devices).
5. You will be redirected to the Dashboard.

### Logging In Again
Once your device is registered, the app remembers you. Just open the app and you're ready to go.

---

## 2. Dashboard

The Dashboard is your home screen showing today's business at a glance.

| Card | What it shows |
|------|--------------|
| **Today's Revenue** | Total sales amount and number of transactions |
| **Cash Balance** | Opening balance + cash sales - expenses |
| **Cash / Transfer** | Breakdown of sales by payment method |
| **Expenses Today** | Total expenses recorded today |

### Stock Alerts
- **Out of Stock** (red section) — products with zero stock. You cannot sell these until restocked.
- **Low Stock** (amber section) — products running low. Restock soon.

### Recent Transactions
Shows the last 10 sales with sale number, customer, amount, and payment method.

---

## 3. Making a Sale

### Step 1: Add Items to Cart
1. Go to the **Stocks** page (tap "Stocks" in the bottom navigation).
2. Browse or search for a product.
3. Tap **+ Cart** on the product you want to sell.
4. If the product has multiple sizes, select the size first.
5. Set the quantity using the +/- buttons or type a number.
6. Tap **Add to Cart**.
7. Repeat for more items.

### Step 2: Checkout
1. Go to the **POS** page (tap the POS icon in the bottom navigation).
2. Review your cart — you can adjust quantities or remove items.
3. **Customer** (optional): Tap "Search" to find an existing customer, or "Add New" to create one.
4. **Discount** (optional): Select "Flat (Rp)" for a fixed amount off, or "% Off" for a percentage discount.
5. **Payment Method**: Tap **Cash** or **Bank Transfer**.
6. Tap **Complete Sale** at the bottom.

### Step 3: Receipt
After completing the sale, you'll see a receipt page where you can:
- **Print** the receipt
- **Download PDF** for digital records
- **New Sale** to start a fresh transaction

### Offline Sales
If you lose internet connection, you can still make **cash sales**. They will be saved locally and automatically uploaded when you reconnect. Bank transfer sales require an internet connection.

---

## 4. Managing Products

### Adding a New Product
1. Go to **Stocks** > tap **+ Add**.
2. Fill in the product name (required).
3. Optionally select or create a category.
4. **Track stock quantity** — enable this to track inventory levels. Disable for items you don't count.
5. **Low stock alert** — set a threshold to get Dashboard warnings when stock runs low.
6. **Sizes / Variants** — add different sizes with their own prices and stock:
   - For single-size products: leave the size label blank, just set price and stock.
   - For multi-size products: enter a label (e.g., "500g", "1kg"), price, and stock for each size.
7. Tap **Add Product**.

### Editing a Product
1. Go to **Stocks** > tap **Adjust Stock**.
2. Search for and select the product.
3. Edit any field — name, category, prices, stock quantities, etc.
4. If you change stock quantities, a **note field** appears. Enter the reason for the change (e.g., "received new shipment", "counted mismatch").
5. Tap **Save Changes**.

Stock changes are automatically logged for audit purposes and will appear in the Reports > Stock Adj. tab.

### Deleting a Product
1. Go to **Stocks** > **Adjust Stock** > select the product.
2. Tap the red **Delete** button at the bottom.
3. Confirm the deletion.

Note: Deleting a product is a soft delete — it won't appear in your product list but historical sales data is preserved.

---

## 5. Expenses

Record daily business expenses (electricity, supplies, rent, etc.).

1. Go to the **Expenses** page.
2. Enter a description (e.g., "Electricity bill").
3. Enter the amount in Rupiah.
4. Tap **Record Expense**.

Expenses are deducted from your cash balance on the Dashboard and affect the EOD cash count calculation.

All expenses for the day are listed below the form with their timestamps.

---

## 6. Cash Count (End of Day)

At the end of each business day, count your cash and record it.

1. Go to the **Cash EOD** page.
2. Review the summary:
   - **Opening Balance** — carried over from yesterday's count.
   - **Cash Sales** — total cash sales today.
   - **Expenses** — total cash expenses today.
   - **Expected Cash** — what should be in the register (opening + sales - expenses).
3. Count the physical cash in your register.
4. Enter the actual amount in the **Physical Cash Count** field.
5. The system instantly shows the difference:
   - **Green** = your count matches or you're over.
   - **Red** = your count is short.
6. Add notes if needed (e.g., "gave change to next-door shop").
7. Tap **Submit Count**.

Tomorrow's opening balance will automatically be set to your actual count.

---

## 7. Reports

### Sales History
1. Go to **Reports** > **Sales** tab.
2. Use the date arrows to navigate between days.
3. Search by customer name or filter by payment method.
4. Tap a sale to expand and see item details.

### Processing a Refund
1. In the Reports > Sales tab, expand a sale.
2. Check the checkbox next to items you want to refund.
3. Tap the **Refund** button that appears at the bottom.
4. The refund will:
   - Restore stock for tracked products.
   - Log the stock change as a "refund" adjustment.
   - Mark the items as refunded (shown with strikethrough).
5. Already-refunded items cannot be refunded again.

### Expenses History
1. Go to **Reports** > **Expenses** tab.
2. View all expenses for the selected date.

### Stock Adjustments
1. Go to **Reports** > **Stock Adj.** tab.
2. View all stock changes: manual adjustments, sales deductions, and refund restorations.
3. Each entry shows the quantity change (+/-), product name, reason/note, and timestamp.

---

## 8. Offline Mode

The app works offline with limited functionality:

| Feature | Online | Offline |
|---------|--------|---------|
| Cash sales | Yes | Yes (queued) |
| Bank transfer sales | Yes | No |
| View products/stock | Yes | Cached |
| Add/edit products | Yes | No |
| Record expenses | Yes | No |
| EOD cash count | Yes | No |
| View reports | Yes | No |

When you regain internet connection, any queued cash sales will automatically sync. You'll see a toast notification for each synced sale.

---

## 9. Quick Reference

| Page | How to access | What you can do |
|------|--------------|-----------------|
| Dashboard | Bottom nav: Home | View today's metrics, stock alerts, recent sales |
| Checkout (POS) | Bottom nav: POS | Review cart, add customer, apply discount, complete sale |
| Stocks | Bottom nav: Stocks | Browse products, add to cart, manage products |
| Add Product | Stocks > + Add | Create new products with variants |
| Edit Product | Stocks > Adjust Stock | Edit product details, adjust stock levels |
| Expenses | Bottom nav: Expenses | Record and view daily expenses |
| Cash EOD | Bottom nav: Cash EOD | End-of-day cash reconciliation |
| Reports | Bottom nav: Reports | View sales history, expenses, stock adjustments, process refunds |

### Tips
- Use the **search bar** on any list page to quickly find what you need.
- The **? button** on each page opens a quick help dialog.
- Stock colors: **red** = out of stock, **amber** = low stock.
- Sale badges: **Cash** (dark), **Transfer** (light), **Refund** (amber).
