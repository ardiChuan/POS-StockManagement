using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FishController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string status = "available")
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        var q = "select=*&order=created_at.desc";
        if (status != "all") q += $"&status=eq.{status}";
        var data = await db.Select<object>("fish", q);
        return Ok(data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        var item = await db.SelectOne<object>("fish", $"select=*&id=eq.{id}");
        if (item == null) return NotFound(new { error = "Not found" });
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FishRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });
        if (string.IsNullOrWhiteSpace(req.FishDisplayId) || string.IsNullOrWhiteSpace(req.TankId) || req.Price == null)
            return BadRequest(new { error = "fish_display_id, tank_id, and price are required" });

        var created = await db.Insert<object>("fish", new
        {
            fish_display_id = req.FishDisplayId.Trim(),
            tank_id = req.TankId.Trim(),
            size_label = string.IsNullOrWhiteSpace(req.SizeLabel) ? null : req.SizeLabel.Trim(),
            photo_url = req.PhotoUrl,
            price = req.Price,
            notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            status = "available"
        });
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] FishRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var updated = await db.Update<object>("fish", $"id=eq.{id}", new
        {
            fish_display_id = req.FishDisplayId?.Trim(),
            tank_id = req.TankId?.Trim(),
            size_label = string.IsNullOrWhiteSpace(req.SizeLabel) ? null : req.SizeLabel.Trim(),
            photo_url = req.PhotoUrl,
            price = req.Price,
            notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            updated_at = DateTime.UtcNow
        });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var fish = await db.SelectOne<Fish>("fish", $"select=status&id=eq.{id}");
        if (fish?.Status == "sold") return StatusCode(409, new { error = "Cannot delete a sold fish" });

        await db.Delete("fish", $"id=eq.{id}");
        return Ok(new { success = true });
    }
}

public record FishRequest(string? FishDisplayId, string? TankId, string? SizeLabel, string? PhotoUrl, decimal? Price, string? Notes);
