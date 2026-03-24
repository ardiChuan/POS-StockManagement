using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/store-config")]
[Authorize]
public class StoreConfigController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        var config = await db.SelectOne<object>("store_config", "select=store_name,setup_complete,updated_at&id=eq.1");
        return Ok(config);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] StoreConfigRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var updates = new Dictionary<string, object> { ["updated_at"] = DateTime.UtcNow };
        if (!string.IsNullOrWhiteSpace(req.StoreName)) updates["store_name"] = req.StoreName.Trim();
        if (!string.IsNullOrWhiteSpace(req.NewAccessCode))
            updates["access_code"] = BCrypt.Net.BCrypt.HashPassword(req.NewAccessCode.Trim());

        var updated = await db.Update<object>("store_config", "id=eq.1", updates);
        return Ok(updated);
    }
}

public record StoreConfigRequest(string? StoreName, string? NewAccessCode);
