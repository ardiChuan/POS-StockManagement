namespace AponkRed.Api.Models;

public class CashRegister
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal? ExpectedCash { get; set; }
    public decimal? ActualCash { get; set; }
    public decimal? Discrepancy { get; set; }
    public string? Notes { get; set; }
    public Guid? ClosedByDeviceId { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
