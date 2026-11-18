using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Portfolio.Api.Auth;
using Portfolio.Api.Data;

namespace Portfolio.Api.Sections;

internal static class SectionOrderEndpoints
{
    private static readonly (string Key, string Title)[] Sections =
    [
        ("work", "Selected Work"), ("skills", "Technical Skills"),
        ("expertise", "Engineering Expertise"), ("experience", "Professional Experience"),
        ("education", "Education & Certifications"), ("contact", "Contact")
    ];

    private static readonly string[] Keys = Sections.Select(section => section.Key).ToArray();

    internal static async Task<IResult> Read(HttpContext context, PortfolioDbContext db,
        ILogger<PortfolioDbContext> logger, CancellationToken ct)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (string.IsNullOrWhiteSpace(db.Database.GetConnectionString())) return Unavailable();
        try
        {
            var rows = await db.Sections.AsNoTracking().Where(section => Keys.Contains(section.Key))
                .OrderBy(section => section.SortOrder).ThenBy(section => section.Key)
                .Select(section => new { section.Key, section.SortOrder }).ToListAsync(ct);
            var keys = rows.Select(row => Keys.FirstOrDefault(key =>
                string.Equals(key, row.Key, StringComparison.OrdinalIgnoreCase)) ?? row.Key).ToArray();
            var hasOrder = Valid(keys) && rows.Select(row => row.SortOrder).Distinct().Count() == Keys.Length;
            return Results.Ok(new SectionOrder(hasOrder ? keys : Keys));
        }
        catch (SqlException ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "The portfolio section order could not be read.");
            return Unavailable();
        }
    }

    internal static async Task<IResult> Save(SectionOrder request, ClaimsPrincipal principal,
        UserManager<IdentityUser> users, PortfolioDbContext db, ILogger<PortfolioDbContext> logger, CancellationToken ct)
    {
        var keys = request.Keys;
        if (keys is null || !Valid(keys))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["keys"] = ["Provide each of the six reorderable portfolio section keys exactly once."]
            });

        if (string.IsNullOrWhiteSpace(db.Database.GetConnectionString())) return Unavailable();
        try
        {
            var id = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var user = id is null ? null : await users.FindByIdAsync(id);
            if (user is null || !await users.IsInRoleAsync(user, AuthSettings.Admin)) return Results.Forbid();

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            await db.Database.ExecuteSqlRawAsync("""
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource = N'Portfolio.Sections.Order',
                    @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
                IF @result < 0 THROW 51002, 'Portfolio section order lock unavailable.', 1;
                """, ct);
            var existing = await db.Sections.Where(section => Keys.Contains(section.Key)).ToListAsync(ct);
            var byKey = existing.ToDictionary(section => section.Key, StringComparer.OrdinalIgnoreCase);
            for (var index = 0; index < keys.Length; index++)
            {
                var key = keys[index];
                if (byKey.TryGetValue(key, out var section)) section.SortOrder = index;
                else db.Sections.Add(new PortfolioSection
                {
                    Key = key, Title = Sections.Single(item => item.Key == key).Title,
                    Body = "", IsEnabled = true, SortOrder = index
                });
            }
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Results.Ok(new SectionOrder(keys));
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is SqlException or DbUpdateException)
        {
            logger.LogWarning(ex, "The portfolio section order could not be saved.");
            return Unavailable();
        }
    }

    private static bool Valid(string[] keys) =>
        keys.Length == Keys.Length && Keys.ToHashSet(StringComparer.Ordinal).SetEquals(keys);

    private static IResult Unavailable() =>
        Results.Problem(title: "The portfolio section order is temporarily unavailable.", statusCode: 503);
}

internal sealed record SectionOrder(string[]? Keys);
