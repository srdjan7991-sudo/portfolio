using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Portfolio.Api.Auth;
using Portfolio.Api.Data;

namespace Portfolio.Api.Sections;

internal static class SectionEndpoints
{
    internal static void MapPortfolioSections(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/sections", List)
            .WithSummary("List published portfolio sections")
            .WithDescription("Returns enabled sections in display order.")
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);
        endpoints.MapGet("/api/sections/order", SectionOrderEndpoints.Read)
            .WithSummary("Get the order of the portfolio sections")
            .Produces<SectionOrder>().ProducesProblem(503);
        endpoints.MapPut("/api/sections/order", SectionOrderEndpoints.Save)
            .RequireAuthorization(AuthSettings.Admin)
            .WithSummary("Set the order of the six reorderable portfolio sections")
            .Produces<SectionOrder>().ProducesValidationProblem().Produces(401).Produces(403)
            .Produces<SectionOrder>(409).ProducesProblem(503);
    }

    private static async Task<Results<Ok<List<PublicSection>>, ProblemHttpResult>> List(
        PortfolioDbContext database,
        ILogger<PortfolioDbContext> logger,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(database.Database.GetConnectionString()))
        {
            return DatabaseUnavailable();
        }

        try
        {
            var sections = await database.Sections.AsNoTracking()
                .Where(section => section.IsEnabled)
                .OrderBy(section => section.SortOrder)
                .ThenBy(section => section.Key)
                .Select(section => new PublicSection(section.Key, section.Title, section.Body))
                .ToListAsync(cancellationToken);

            return TypedResults.Ok(sections);
        }
        catch (SqlException exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(exception, "The portfolio sections database could not be queried.");
            return DatabaseUnavailable();
        }
    }

    private static ProblemHttpResult DatabaseUnavailable() =>
        TypedResults.Problem(
            title: "Portfolio sections are temporarily unavailable.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
}

internal sealed record PublicSection(string Key, string Title, string Body);
