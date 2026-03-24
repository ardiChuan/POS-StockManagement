using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(SupabaseService db) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        if (HttpContext.Items["Device"] is not Device) return Unauthorized(new { error = "Unauthorized" });

        var categories = await db.Select<Category>("categories", "select=id,name&order=name.asc");
        return Ok(categories);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        if (HttpContext.Items["Device"] is not Device) return Unauthorized(new { error = "Unauthorized" });
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name is required" });

        var existing = await db.SelectOne<Category>("categories", $"select=id,name&name=ilike.{Uri.EscapeDataString(req.Name.Trim())}");
        if (existing != null) return Ok(existing);

        var created = await db.Insert<Category>("categories", new { name = req.Name.Trim() });
        return Ok(created);
    }
}

public record CreateCategoryRequest(string Name);
