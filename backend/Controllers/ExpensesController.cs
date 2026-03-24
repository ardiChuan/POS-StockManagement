using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });

        var q = $"select=*,device:devices(id,name,role)&order=created_at.desc&limit={limit}&offset={offset}";
        if (from != null) q += $"&created_at=gte.{from}T00:00:00.000Z";
        if (to != null) q += $"&created_at=lte.{to}T23:59:59.999Z";

        var (data, count) = await db.SelectPaged<object>("expenses", q);
        return Ok(new { data, count });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ExpenseRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (string.IsNullOrWhiteSpace(req.Description)) return BadRequest(new { error = "description required" });
        if (req.Amount <= 0) return BadRequest(new { error = "valid amount required" });

        var created = await db.Insert<object>("expenses", new
        {
            description = req.Description.Trim(),
            amount = req.Amount,
            device_id = Dev.Id
        });

        // Ensure today's cash_register row exists
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var existing = await db.SelectOne<object>("cash_register", $"select=id&date=eq.{today}");
        if (existing == null)
        {
            var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
            var prev = await db.SelectOne<CashRegister>("cash_register", $"select=actual_cash&date=eq.{yesterday}");
            await db.Insert<object>("cash_register", new { date = today, opening_balance = prev?.ActualCash ?? 0m });
        }

        return StatusCode(201, created);
    }
}

public record ExpenseRequest(string Description, decimal Amount);
