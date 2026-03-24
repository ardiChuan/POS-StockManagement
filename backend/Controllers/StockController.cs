using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/stock")]
[Authorize]
public class StockController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust([FromBody] AdjustRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });
        if (req.ProductId == null || req.QtyChange == null)
            return BadRequest(new { error = "product_id and qty_change required" });

        if (req.VariantId != null)
        {
            var variant = await db.SelectOne<ProductVariant>("product_variants", $"select=stock_qty&id=eq.{req.VariantId}");
            if (variant == null) return NotFound(new { error = "Variant not found" });

            var newQty = Math.Max(0, variant.StockQty + req.QtyChange.Value);
            await db.Update("product_variants", $"id=eq.{req.VariantId}", new { stock_qty = newQty, updated_at = DateTime.UtcNow });
            await db.Insert<object>("stock_adjustments", new
            {
                product_id = req.ProductId,
                variant_id = req.VariantId,
                adjustment_type = "manual",
                qty_before = variant.StockQty,
                qty_change = req.QtyChange,
                qty_after = newQty,
                note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                device_id = Dev.Id
            });
            return Ok(new { stock_qty = newQty });
        }
        else
        {
            var product = await db.SelectOne<Product>("products", $"select=stock_qty&id=eq.{req.ProductId}");
            if (product == null) return NotFound(new { error = "Product not found" });

            var newQty = Math.Max(0, (product.StockQty ?? 0) + req.QtyChange.Value);
            await db.Update("products", $"id=eq.{req.ProductId}", new { stock_qty = newQty, updated_at = DateTime.UtcNow });
            await db.Insert<object>("stock_adjustments", new
            {
                product_id = req.ProductId,
                variant_id = (string?)null,
                adjustment_type = "manual",
                qty_before = product.StockQty ?? 0,
                qty_change = req.QtyChange,
                qty_after = newQty,
                note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                device_id = Dev.Id
            });
            return Ok(new { stock_qty = newQty });
        }
    }

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments()
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var data = await db.Select<object>("stock_adjustments",
            "select=*,product:products(name),variant:product_variants(size_label)&adjustment_type=eq.manual&order=created_at.desc&limit=50");
        return Ok(data);
    }
}

public record AdjustRequest(string? ProductId, string? VariantId, int? QtyChange, string? Note);
