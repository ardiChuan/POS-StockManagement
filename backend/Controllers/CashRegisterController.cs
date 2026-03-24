using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api/cash-register")]
[Authorize]
public class CashRegisterController(SupabaseService db) : ControllerBase
{
    Device? Dev => HttpContext.Items["Device"] as Device;
    bool IsAdmin => Dev?.Role is "admin" or "owner";

    [HttpGet("today")]
    public async Task<IActionResult> Today()
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var todayStart = $"{today}T00:00:00.000Z";
        var todayEnd = $"{today}T23:59:59.999Z";

        var register = await db.SelectOne<CashRegister>("cash_register", $"select=*&date=eq.{today}");

        var salesTask = db.Select<SaleTotal>("sales", $"select=total&payment_method=eq.cash&created_at=gte.{todayStart}&created_at=lte.{todayEnd}");
        var expensesTask = db.Select<ExpenseAmount>("expenses", $"select=amount&created_at=gte.{todayStart}&created_at=lte.{todayEnd}");
        await Task.WhenAll(salesTask, expensesTask);

        var cashSalesTotal = salesTask.Result.Sum(s => s.Total);
        var expensesTotal = expensesTask.Result.Sum(e => e.Amount);
        var openingBalance = register?.OpeningBalance ?? 0m;
        var expectedCash = openingBalance + cashSalesTotal - expensesTotal;

        return Ok(new
        {
            date = today,
            opening_balance = openingBalance,
            cash_sales_total = cashSalesTotal,
            expenses_total = expensesTotal,
            expected_cash = expectedCash,
            actual_cash = register?.ActualCash,
            discrepancy = register?.Discrepancy,
            closed_at = register?.ClosedAt,
            is_closed = register?.ClosedAt != null
        });
    }

    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] CloseRequest req)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (req.ActualCash == null) return BadRequest(new { error = "actual_cash required" });

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var todayStart = $"{today}T00:00:00.000Z";
        var todayEnd = $"{today}T23:59:59.999Z";

        var register = await db.SelectOne<CashRegister>("cash_register", $"select=*&date=eq.{today}");
        if (register == null)
        {
            var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
            var prev = await db.SelectOne<CashRegister>("cash_register", $"select=actual_cash&date=eq.{yesterday}");
            register = await db.Insert<CashRegister>("cash_register", new { date = today, opening_balance = prev?.ActualCash ?? 0m });
        }

        var salesTask = db.Select<SaleTotal>("sales", $"select=total&payment_method=eq.cash&created_at=gte.{todayStart}&created_at=lte.{todayEnd}");
        var expensesTask = db.Select<ExpenseAmount>("expenses", $"select=amount&created_at=gte.{todayStart}&created_at=lte.{todayEnd}");
        await Task.WhenAll(salesTask, expensesTask);

        var cashSales = salesTask.Result.Sum(s => s.Total);
        var expenses = expensesTask.Result.Sum(e => e.Amount);
        var expectedCash = (register?.OpeningBalance ?? 0m) + cashSales - expenses;
        var discrepancy = req.ActualCash.Value - expectedCash;

        var updated = await db.Update<object>("cash_register", $"date=eq.{today}", new
        {
            expected_cash = expectedCash,
            actual_cash = req.ActualCash,
            discrepancy,
            notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            closed_by_device_id = Dev.Id,
            closed_at = DateTime.UtcNow
        });
        return Ok(updated);
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int limit = 30, [FromQuery] int offset = 0)
    {
        if (Dev == null) return Unauthorized(new { error = "Unauthorized" });
        if (!IsAdmin) return StatusCode(403, new { error = "Forbidden" });

        var (data, count) = await db.SelectPaged<object>("cash_register",
            $"select=*,closed_by:devices(id,name,role)&order=date.desc&limit={limit}&offset={offset}");
        return Ok(new { data, count });
    }
}

record SaleTotal(decimal Total);
record ExpenseAmount(decimal Amount);
public record CloseRequest(decimal? ActualCash, string? Notes);
