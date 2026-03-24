using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });

        var query = "select=*&order=name.asc&limit=20";
        if (!string.IsNullOrWhiteSpace(q))
            query += $"&or=(name.ilike.*{Uri.EscapeDataString(q.Trim())}*,phone.ilike.*{Uri.EscapeDataString(q.Trim())}*)";

        var data = await db.Select<object>("customers", query);
        return Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomerRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "name required" });

        var created = await db.Insert<object>("customers", new
        {
            name = req.Name.Trim(),
            phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim()
        });
        return StatusCode(201, created);
    }
}

public record CustomerRequest(string Name, string? Phone);
