namespace Portfolio.Api.Sections;

public sealed class PortfolioSection
{
    public required string Key { get; init; }
    public required string Title { get; set; }
    public required string Body { get; set; }
    public bool IsEnabled { get; set; }
    public int SortOrder { get; set; }
}
