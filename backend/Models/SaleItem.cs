namespace AponkRed.Api.Models;

public class SaleItem
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public string ItemType { get; set; } = "product";
    public Guid? FishId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string Description { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Qty { get; set; }
    public decimal LineTotal { get; set; }
}
