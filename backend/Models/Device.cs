namespace AponkRed.Api.Models;

public class Device
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string DeviceToken { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime RegisteredAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
}
