namespace AponkRed.Api.Models;

public class Sale
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = "";
    public Guid DeviceId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "cash";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Device? Device { get; set; }
    public Customer? Customer { get; set; }
    public List<SaleItem> Items { get; set; } = [];
}
