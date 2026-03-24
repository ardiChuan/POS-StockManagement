namespace AponkRed.Api.Models;

public class Expense
{
    public Guid Id { get; set; }
    public string Description { get; set; } = "";
    public decimal Amount { get; set; }
    public Guid? DeviceId { get; set; }
    public DateTime CreatedAt { get; set; }
}
