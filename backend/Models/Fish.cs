namespace AponkRed.Api.Models;

public class Fish
{
    public Guid Id { get; set; }
    public string FishDisplayId { get; set; } = "";
    public string TankId { get; set; } = "";
    public string? SizeLabel { get; set; }
    public string? PhotoUrl { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; } = "available";
    public string? Notes { get; set; }
    public DateTime? SoldAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
