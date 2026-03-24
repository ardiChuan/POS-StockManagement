using AponkRed.Api.Models;

namespace AponkRed.Api.Middleware;

public class DeviceAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated == true)
        {
            var deviceIdStr = user.FindFirst("deviceId")?.Value;
            var deviceName = user.FindFirst("deviceName")?.Value;
            var role = user.FindFirst("role")?.Value;

            if (Guid.TryParse(deviceIdStr, out var deviceId) && deviceName != null && role != null)
            {
                context.Items["Device"] = new Device
                {
                    Id = deviceId,
                    Name = deviceName,
                    Role = role,
                    IsActive = true
                };
            }
        }

        await next(context);
    }
}
