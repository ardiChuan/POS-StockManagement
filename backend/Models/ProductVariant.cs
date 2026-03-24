namespace AponkRed.Api.Models;

public class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string SizeLabel { get; set; } = "";
    public decimal Price { get; set; }
    public int StockQty { get; set; }
    public int LowStockThreshold { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Product? Product { get; set; }
}
