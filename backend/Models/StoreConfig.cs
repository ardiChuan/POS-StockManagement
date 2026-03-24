namespace AponkRed.Api.Models;

public class StoreConfig
{
    public int Id { get; set; }
    public string StoreName { get; set; } = "";
    public string AccessCode { get; set; } = "";
    public bool SetupComplete { get; set; }
    public DateTime UpdatedAt { get; set; }
}
