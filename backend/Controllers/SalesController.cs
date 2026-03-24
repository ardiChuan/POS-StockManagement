using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SalesController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var q = $"select=*,customer:customers(*),device:devices(id,name,role),items:sale_items(*)&order=created_at.desc&limit={limit}&offset={offset}";
        if (from != null) q += $"&created_at=gte.{from}T00:00:00.000Z";
        if (to != null) q += $"&created_at=lte.{to}T23:59:59.999Z";

        var (data, count) = await db.SelectPaged<object>("sales", q);
        return Ok(new { data, count });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });

        var sale = await db.SelectOne<object>("sales",
            $"select=*,customer:customers(*),device:devices(id,name,role),items:sale_items(*)&id=eq.{id}");
        if (sale == null) return NotFound(new { error = "Sale not found" });
        return Ok(sale);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSaleRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (req.Items == null || req.Items.Count == 0) return BadRequest(new { error = "Cart is empty" });
        if (string.IsNullOrWhiteSpace(req.PaymentMethod)) return BadRequest(new { error = "payment_method required" });

        // ── 1. Resolve customer ──────────────────────────────────────────────
        string? resolvedCustomerId = req.CustomerId;
        if (resolvedCustomerId == null && !string.IsNullOrWhiteSpace(req.CustomerName))
        {
            var newCustomer = await db.Insert<System.Text.Json.JsonElement>("customers", new
            {
                name = req.CustomerName.Trim(),
                phone = string.IsNullOrWhiteSpace(req.CustomerPhone) ? (string?)null : req.CustomerPhone.Trim()
            });
            if (newCustomer.TryGetProperty("id", out var cid))
                resolvedCustomerId = cid.GetString();
        }

        // ── 2. Validate fish availability ────────────────────────────────────
        var fishItems = req.Items.Where(i => i.ItemType == "fish").ToList();
        foreach (var fi in fishItems)
        {
            var available = await db.Count("fish", $"id=eq.{fi.FishId}&status=eq.available");
            if (available == 0)
                return Conflict(new { error = $"Fish {fi.Description} is no longer available" });
        }

        // ── 3. Validate product/variant stock ────────────────────────────────
        var productItems = req.Items.Where(i => i.ItemType == "product").ToList();
        foreach (var pi in productItems)
        {
            if (pi.VariantId != null)
            {
                var variant = await db.SelectOne<ProductVariant>("product_variants",
                    $"select=stock_qty,size_label&id=eq.{pi.VariantId}");
                if (variant == null || variant.StockQty < pi.Qty)
                    return Conflict(new { error = $"Insufficient stock for {pi.Description}" });
            }
            else
            {
                var product = await db.SelectOne<Product>("products",
                    $"select=stock_qty&id=eq.{pi.ProductId}");
                if (product == null || (product.StockQty ?? 0) < pi.Qty)
                    return Conflict(new { error = $"Insufficient stock for {pi.Description}" });
            }
        }

        // ── 4. Calculate totals ───────────────────────────────────────────────
        var subtotal = req.Items.Sum(i => i.UnitPrice * i.Qty);
        decimal discountAmount = 0;
        if (req.DiscountType == "flat") discountAmount = req.DiscountValue;
        else if (req.DiscountType == "percent") discountAmount = subtotal * req.DiscountValue / 100m;
        var total = Math.Max(0, subtotal - discountAmount);

        // ── 5. Generate sale number ───────────────────────────────────────────
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var todayCount = await db.Count("sales", $"created_at=gte.{todayIso}T00:00:00.000Z");
        var saleNumber = $"S-{today}-{(todayCount + 1).ToString().PadLeft(4, '0')}";

        // ── 6. Insert sale ────────────────────────────────────────────────────
        var saleData = new
        {
            sale_number = saleNumber,
            device_id = Dev.Id,
            customer_id = resolvedCustomerId,
            discount_type = string.IsNullOrWhiteSpace(req.DiscountType) ? (string?)null : req.DiscountType,
            discount_value = req.DiscountValue,
            subtotal,
            total,
            payment_method = req.PaymentMethod,
            notes = string.IsNullOrWhiteSpace(req.Notes) ? (string?)null : req.Notes.Trim()
        };

        SaleIdResult? sale;
        try
        {
            sale = await db.Insert<SaleIdResult>("sales", saleData);
        }
        catch
        {
            // Retry on sale number collision
            var retryNumber = $"S-{today}-{(todayCount + 2).ToString().PadLeft(4, '0')}";
            var retryData = new
            {
                sale_number = retryNumber,
                device_id = Dev.Id,
                customer_id = resolvedCustomerId,
                discount_type = string.IsNullOrWhiteSpace(req.DiscountType) ? (string?)null : req.DiscountType,
                discount_value = req.DiscountValue,
                subtotal,
                total,
                payment_method = req.PaymentMethod,
                notes = string.IsNullOrWhiteSpace(req.Notes) ? (string?)null : req.Notes.Trim()
            };
            sale = await db.Insert<SaleIdResult>("sales", retryData);
        }

        if (sale == null) return StatusCode(500, new { error = "Failed to create sale" });
        var saleId = sale.Id.ToString();
        var now = DateTime.UtcNow.ToString("O");

        // ── 7. Insert sale items ──────────────────────────────────────────────
        var saleItemRows = req.Items.Select(i => (object)new
        {
            sale_id = saleId,
            item_type = i.ItemType,
            fish_id = i.FishId,
            product_id = i.ProductId,
            variant_id = i.VariantId,
            description = i.Description,
            unit_price = i.UnitPrice,
            qty = i.Qty,
            line_total = i.UnitPrice * i.Qty
        }).ToList();
        await db.InsertMany("sale_items", saleItemRows);

        // ── 8. Mark fish as sold ──────────────────────────────────────────────
        foreach (var fi in fishItems)
            await db.Update("fish", $"id=eq.{fi.FishId}", new { status = "sold", sold_at = now, updated_at = now });

        // ── 9. Deduct stock + log adjustments ─────────────────────────────────
        foreach (var pi in productItems)
        {
            if (pi.VariantId != null)
            {
                var variant = await db.SelectOne<ProductVariant>("product_variants",
                    $"select=stock_qty&id=eq.{pi.VariantId}");
                if (variant != null)
                {
                    var newQty = variant.StockQty - pi.Qty;
                    await db.Update("product_variants", $"id=eq.{pi.VariantId}",
                        new { stock_qty = newQty, updated_at = now });
                    await db.Insert<object>("stock_adjustments", new
                    {
                        product_id = pi.ProductId,
                        variant_id = pi.VariantId,
                        adjustment_type = "sale",
                        qty_before = variant.StockQty,
                        qty_change = -pi.Qty,
                        qty_after = newQty,
                        note = $"Sale {saleId}",
                        device_id = Dev.Id,
                        related_sale_id = saleId
                    });
                }
            }
            else
            {
                var product = await db.SelectOne<Product>("products",
                    $"select=stock_qty&id=eq.{pi.ProductId}");
                if (product != null)
                {
                    var newQty = (product.StockQty ?? 0) - pi.Qty;
                    await db.Update("products", $"id=eq.{pi.ProductId}",
                        new { stock_qty = newQty, updated_at = now });
                    await db.Insert<object>("stock_adjustments", new
                    {
                        product_id = pi.ProductId,
                        variant_id = (string?)null,
                        adjustment_type = "sale",
                        qty_before = product.StockQty ?? 0,
                        qty_change = -pi.Qty,
                        qty_after = newQty,
                        note = $"Sale {saleId}",
                        device_id = Dev.Id,
                        related_sale_id = saleId
                    });
                }
            }
        }

        // ── 10. Ensure today's cash_register row exists ───────────────────────
        var existing = await db.SelectOne<object>("cash_register", $"select=id&date=eq.{todayIso}");
        if (existing == null)
        {
            var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
            var prev = await db.SelectOne<CashRegister>("cash_register", $"select=actual_cash&date=eq.{yesterday}");
            await db.Insert<object>("cash_register", new { date = todayIso, opening_balance = prev?.ActualCash ?? 0m });
        }

        return StatusCode(201, new { id = saleId });
    }
}

public class CreateSaleRequest
{
    public List<SaleItemRequest> Items { get; set; } = [];
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public string PaymentMethod { get; set; } = "";
    public string? Notes { get; set; }
}

public class SaleItemRequest
{
    public string ItemType { get; set; } = "product";
    public string? FishId { get; set; }
    public string? ProductId { get; set; }
    public string? VariantId { get; set; }
    public string Description { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Qty { get; set; }
}

record SaleIdResult(Guid Id);
