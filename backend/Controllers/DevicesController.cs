using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DevicesController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var data = await db.Select<object>("devices",
            "select=id,name,role,is_active,registered_at,last_seen_at&order=registered_at.desc");
        return Ok(data);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(string id)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });
        if (id == Dev.Id.ToString()) return BadRequest(new { error = "Cannot deactivate your own device" });

        await db.Update("devices", $"id=eq.{id}", new { is_active = false });
        return Ok(new { success = true });
    }
}
