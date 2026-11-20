using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Portfolio.Api.Data;

namespace Portfolio.Api.Auth;

internal static class AuthConfiguration
{
    public static void AddPortfolioAuth(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<AuthSettings>();
        builder.Services.AddSingleton<DummyPassword>();
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddIdentityCore<IdentityUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = AuthSettings.MinimumSignupPasswordLength;
            options.Password.RequireDigit = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            options.Lockout.AllowedForNewUsers = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        }).AddRoles<IdentityRole>().AddEntityFrameworkStores<PortfolioDbContext>().AddSignInManager();
        builder.Services.Configure<PasswordHasherOptions>(options => options.IterationCount = 210_000);

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.IncludeErrorDetails = false;
            options.TokenValidationParameters = new()
            {
                ValidateIssuerSigningKey = true,
                RequireSignedTokens = true,
                ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                ValidTypes = [AuthSettings.TokenType],
                ValidIssuer = AuthSettings.Issuer,
                ValidateIssuer = true,
                ValidAudience = AuthSettings.Audience,
                ValidateAudience = true,
                IgnoreTrailingSlashWhenValidatingAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = "role",
                NameClaimType = JwtRegisteredClaimNames.Sub,
            };
            options.Events = new JwtBearerEvents { OnTokenValidated = ValidateSession };
        });
        builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<AuthSettings>((options, settings) =>
                options.TokenValidationParameters.IssuerSigningKey = settings.Enabled ? settings.SigningKey : null);

        builder.Services.AddAuthorizationBuilder().AddPolicy(AuthSettings.Admin,
            policy => policy.RequireAuthenticatedUser().RequireRole(AuthSettings.Admin));
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            foreach (var (policy, limit) in new[]
            {
                ("auth-attempts", 10), ("auth-setup-status", 30), ("auth-refresh", 30), ("auth-logout", 30),
            })
            {
                options.AddPolicy(policy, context => RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "local",
                    _ => new FixedWindowRateLimiterOptions { PermitLimit = limit, Window = TimeSpan.FromMinutes(1) }));
            }
        });
    }

    private static async Task ValidateSession(TokenValidatedContext context)
    {
        var principal = context.Principal!;
        var userId = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var now = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow();
        if (string.IsNullOrEmpty(userId) ||
            !Guid.TryParseExact(principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value, "N", out _) ||
            !long.TryParse(principal.FindFirst(JwtRegisteredClaimNames.Iat)?.Value, NumberStyles.None,
                CultureInfo.InvariantCulture, out var issued) || issued <= 0 || issued > now.ToUnixTimeSeconds() ||
            !Guid.TryParse(principal.FindFirst("sid")?.Value, out var sessionId))
        {
            context.Fail("Invalid token claims.");
            return;
        }
        var db = context.HttpContext.RequestServices.GetRequiredService<PortfolioDbContext>();
        if (!await db.AuthSessions.AnyAsync(session => session.Id == sessionId && session.UserId == userId &&
            session.RevokedAt == null && session.ExpiresAt > now, context.HttpContext.RequestAborted))
        {
            context.Fail("Inactive session.");
        }
    }
}
