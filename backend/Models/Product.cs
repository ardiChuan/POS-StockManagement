namespace AponkRed.Api.Models;

public class Product
{
    public Guid Id { get; set; }
    public Guid? CategoryId { get; set; }
    public string Name { get; set; } = "";
    public bool IsFish { get; set; }
    public decimal? Price { get; set; }
    public int? StockQty { get; set; }
    public int LowStockThreshold { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category? Category { get; set; }
    public List<ProductVariant> Variants { get; set; } = [];
}
