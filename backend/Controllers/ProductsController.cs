using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? is_fish, [FromQuery] string? category_id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });

        var q = "select=*,category:categories(*),variants:product_variants(*)&is_active=eq.true&order=name.asc";
        if (is_fish != null) q += $"&is_fish=eq.{is_fish}";
        if (category_id != null) q += $"&category_id=eq.{category_id}";

        var data = await db.Select<object>(q.StartsWith("select") ? "products" : "products", q);
        return Ok(data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        var item = await db.SelectOne<object>("products", $"select=*,category:categories(*),variants:product_variants(*)&id=eq.{id}");
        if (item == null) return NotFound(new { error = "Not found" });
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProductRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "name required" });

        var created = await db.Insert<object>("products", new
        {
            name = req.Name.Trim(),
            category_id = req.CategoryId,
            is_fish = req.IsFish ?? false,
            price = req.Price,
            stock_qty = req.StockQty,
            low_stock_threshold = req.LowStockThreshold ?? 5,
            updated_at = DateTime.UtcNow
        });
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] ProductRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var updated = await db.Update<object>("products", $"id=eq.{id}", new
        {
            name = req.Name?.Trim(),
            category_id = req.CategoryId,
            is_fish = req.IsFish ?? false,
            price = req.Price,
            stock_qty = req.StockQty,
            low_stock_threshold = req.LowStockThreshold ?? 5,
            updated_at = DateTime.UtcNow
        });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        await db.Update("products", $"id=eq.{id}", new { is_active = false, updated_at = DateTime.UtcNow });
        return Ok(new { success = true });
    }

    [HttpPost("{id}/variants")]
    public async Task<IActionResult> CreateVariant(string id, [FromBody] VariantRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });
        if (string.IsNullOrWhiteSpace(req.SizeLabel) || req.Price == null)
            return BadRequest(new { error = "size_label and price required" });

        await db.Update("products", $"id=eq.{id}", new { price = (decimal?)null, stock_qty = (int?)null, updated_at = DateTime.UtcNow });

        var created = await db.Insert<object>("product_variants", new
        {
            product_id = id,
            size_label = req.SizeLabel.Trim(),
            price = req.Price,
            stock_qty = req.StockQty ?? 0,
            low_stock_threshold = req.LowStockThreshold ?? 5
        });
        return StatusCode(201, created);
    }

    [HttpPut("{id}/variants/{vid}")]
    public async Task<IActionResult> UpdateVariant(string id, string vid, [FromBody] VariantRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var updated = await db.Update<object>("product_variants", $"id=eq.{vid}", new
        {
            size_label = req.SizeLabel?.Trim(),
            price = req.Price,
            stock_qty = req.StockQty,
            low_stock_threshold = req.LowStockThreshold,
            updated_at = DateTime.UtcNow
        });
        return Ok(updated);
    }

    [HttpDelete("{id}/variants/{vid}")]
    public async Task<IActionResult> DeleteVariant(string id, string vid)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        await db.Delete("product_variants", $"id=eq.{vid}");

        var remaining = await db.Select<object>("product_variants", $"select=id&product_id=eq.{id}");
        if (remaining.Count == 0)
            await db.Update("products", $"id=eq.{id}", new { price = 0m, stock_qty = 0, updated_at = DateTime.UtcNow });

        return Ok(new { success = true });
    }
}

public record ProductRequest(string? Name, string? CategoryId, bool? IsFish, decimal? Price, int? StockQty, int? LowStockThreshold);
public record VariantRequest(string? SizeLabel, decimal? Price, int? StockQty, int? LowStockThreshold);
