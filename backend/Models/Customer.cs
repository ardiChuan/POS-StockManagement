namespace AponkRed.Api.Models;

public class Customer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public DateTime CreatedAt { get; set; }
}
