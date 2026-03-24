using AponkRed.Api.Models;
using AponkRed.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AponkRed.Api.Controllers;

[ApiController]
[Route("api")]
public class AuthController(SupabaseService db, TokenService tokens) : ControllerBase
{
    [HttpGet("setup")]
    public async Task<IActionResult> GetSetup()
    {
        var config = await db.SelectOne<StoreConfig>("store_config", "select=setup_complete,store_name&id=eq.1");
        return Ok(new
        {
            setup_complete = config?.SetupComplete ?? false,
            store_name = config?.StoreName
        });
    }

    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.AccessCode) || string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Role))
            return BadRequest(new { error = "Missing required fields" });

        if (!new[] { "owner", "admin", "cashier" }.Contains(req.Role))
            return BadRequest(new { error = "Invalid role" });

        var config = await db.SelectOne<StoreConfig>("store_config", "select=*&id=eq.1");
        bool isFirstSetup = config?.SetupComplete != true;

        if (isFirstSetup)
        {
            if (string.IsNullOrWhiteSpace(req.StoreName))
                return BadRequest(new { error = "store_name required for first setup" });

            var hashedCode = BCrypt.Net.BCrypt.HashPassword(req.AccessCode);
            await db.Upsert("store_config", new
            {
                id = 1,
                store_name = req.StoreName,
                access_code = hashedCode,
                setup_complete = true,
                updated_at = DateTime.UtcNow
            });
        }
        else
        {
            if (!BCrypt.Net.BCrypt.Verify(req.AccessCode, config!.AccessCode))
                return Unauthorized(new { error = "Invalid access code" });
        }

        var device = await db.Insert<Device>("devices", new
        {
            name = req.Name,
            role = req.Role,
            device_token = Guid.NewGuid().ToString("N"),
            is_active = true,
            registered_at = DateTime.UtcNow
        });

        if (device == null) return StatusCode(500, new { error = "Failed to register device" });

        var token = tokens.GenerateToken(device);
        return Ok(new { success = true, token, role = device.Role, name = device.Name });
    }

    [HttpGet("auth/me")]
    [Authorize]
    public IActionResult Me()
    {
        if (HttpContext.Items["Device"] is not Device device)
            return Unauthorized(new { error = "Not authenticated" });

        return Ok(new { id = device.Id, name = device.Name, role = device.Role });
    }

    [HttpPost("auth/logout")]
    public IActionResult Logout() => Ok(new { success = true });
}

public record SetupRequest(string? StoreName, string AccessCode, string Name, string Role);
