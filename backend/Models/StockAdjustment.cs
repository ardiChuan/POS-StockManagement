namespace AponkRed.Api.Models;

public class StockAdjustment
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string AdjustmentType { get; set; } = "manual";
    public int QtyBefore { get; set; }
    public int QtyChange { get; set; }
    public int QtyAfter { get; set; }
    public string? Note { get; set; }
    public Guid? DeviceId { get; set; }
    public Guid? RelatedSaleId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}
