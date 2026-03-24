using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet("sales")]
    public async Task<IActionResult> Sales([FromQuery] string? from, [FromQuery] string? to)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var f = from ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        var t = to ?? f;
        var sales = await db.Select<SaleRow>("sales",
            $"select=total,payment_method&created_at=gte.{f}T00:00:00.000Z&created_at=lte.{t}T23:59:59.999Z");

        return Ok(new
        {
            from = f, to = t,
            total_revenue = sales.Sum(s => s.Total),
            cash_revenue = sales.Where(s => s.PaymentMethod == "cash").Sum(s => s.Total),
            transfer_revenue = sales.Where(s => s.PaymentMethod == "bank_transfer").Sum(s => s.Total),
            transaction_count = sales.Count
        });
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> Expenses([FromQuery] string? from, [FromQuery] string? to)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var f = from ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        var t = to ?? f;
        var data = await db.Select<object>("expenses",
            $"select=*&created_at=gte.{f}T00:00:00.000Z&created_at=lte.{t}T23:59:59.999Z&order=created_at.desc");
        var total = data.Cast<System.Text.Json.JsonElement>()
            .Sum(e => e.TryGetProperty("amount", out var a) ? a.GetDecimal() : 0);

        return Ok(new { from = f, to = t, total, items = data });
    }

    [HttpGet("inventory")]
    public async Task<IActionResult> Inventory()
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var productsTask = db.Select<System.Text.Json.JsonElement>("products",
            "select=id,name,is_fish,price,stock_qty,low_stock_threshold,variants:product_variants(size_label,price,stock_qty,low_stock_threshold)&is_active=eq.true&order=name.asc");
        var fishTask = db.Select<object>("fish", "select=id&status=eq.available");
        await Task.WhenAll(productsTask, fishTask);

        var productRows = productsTask.Result.SelectMany(p =>
        {
            var variants = p.TryGetProperty("variants", out var v) ? v.EnumerateArray().ToList() : [];
            if (variants.Count > 0)
            {
                return variants.Select(variant => new
                {
                    id = p.GetProperty("id").GetString(),
                    name = $"{p.GetProperty("name").GetString()} ({variant.GetProperty("size_label").GetString()})",
                    is_fish = p.GetProperty("is_fish").GetBoolean(),
                    stock_qty = variant.GetProperty("stock_qty").GetInt32(),
                    price = variant.GetProperty("price").GetDecimal(),
                    low_stock_threshold = variant.GetProperty("low_stock_threshold").GetInt32(),
                    is_low_stock = variant.GetProperty("stock_qty").GetInt32() <= variant.GetProperty("low_stock_threshold").GetInt32() && variant.GetProperty("stock_qty").GetInt32() > 0,
                    is_out_of_stock = variant.GetProperty("stock_qty").GetInt32() == 0
                });
            }
            var stockQty = p.TryGetProperty("stock_qty", out var sq) && sq.ValueKind != System.Text.Json.JsonValueKind.Null ? sq.GetInt32() : 0;
            var threshold = p.GetProperty("low_stock_threshold").GetInt32();
            return new[] { new
            {
                id = p.GetProperty("id").GetString(),
                name = p.GetProperty("name").GetString(),
                is_fish = p.GetProperty("is_fish").GetBoolean(),
                stock_qty = stockQty,
                price = p.TryGetProperty("price", out var pr) && pr.ValueKind != System.Text.Json.JsonValueKind.Null ? pr.GetDecimal() : 0m,
                low_stock_threshold = threshold,
                is_low_stock = stockQty <= threshold && stockQty > 0,
                is_out_of_stock = stockQty == 0
            }};
        }).ToList();

        return Ok(new { products = productRows, individual_fish_available = fishTask.Result.Count });
    }
}

record SaleRow(decimal Total, string PaymentMethod);
