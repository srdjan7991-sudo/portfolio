using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Portfolio.Api.Data;

namespace Portfolio.Api.Auth;

internal static class AuthEndpoints
{
    public static void MapPortfolioAuth(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").AddEndpointFilter(async (invocation, next) =>
        {
            var context = invocation.HttpContext;
            context.Response.Headers.CacheControl = "no-store";
            var settings = context.RequestServices.GetRequiredService<AuthSettings>();
            if (!settings.Enabled) return Results.StatusCode(503);

            if (HttpMethods.IsPost(context.Request.Method) &&
                (context.Request.Headers.Origin.Count != 1 ||
                 !string.Equals(context.Request.Headers.Origin.ToString(), settings.Origin, StringComparison.Ordinal) ||
                 context.Request.Headers["X-Portfolio-Auth"].ToString() != "1"))
            {
                return Results.StatusCode(403);
            }
            return await next(invocation);
        });

        auth.MapGet("/setup-status", SetupStatus).RequireRateLimiting("auth-attempts")
            .WithSummary("Check whether the first administrator can be created")
            .Produces<SetupResponse>().Produces(429).Produces(503);
        auth.MapPost("/signup", Signup).RequireRateLimiting("auth-attempts")
            .WithSummary("Create the first administrator")
            .WithDescription("Requires a valid email, a password of 15–128 characters and the setup code. " +
                "On success, returns an access token and sets the refresh cookie. Status 409 means setup is closed.")
            .Produces<TokenResponse>().Produces<CredentialError>(400).Produces(403)
            .Produces<CredentialError>(409).Produces(429).ProducesProblem(500).Produces(503);
        auth.MapPost("/login", Login).RequireRateLimiting("auth-attempts")
            .WithSummary("Sign in as the portfolio administrator")
            .WithDescription("Returns an access token and sets the refresh cookie. Incorrect credentials and locked accounts return the same status and message.")
            .Produces<TokenResponse>().Produces<CredentialError>(400).Produces<CredentialError>(401)
            .Produces(403).Produces(429).Produces(503);
        auth.MapPost("/refresh", Refresh)
            .WithSummary("Renew the access token")
            .WithDescription("The browser sends the HttpOnly, Secure, SameSite=Strict refresh cookie scoped to /api/auth. " +
                "A successful response rotates the cookie. Reusing an already rotated token revokes its session.")
            .Produces<TokenResponse>().Produces(401).Produces(403).Produces(503);
        auth.MapPost("/logout", Logout)
            .WithSummary("Revoke the session and clear the refresh cookie")
            .WithDescription("The browser sends the refresh cookie. A successful response clears it and has no response body.")
            .Produces(204).Produces(403).Produces(503);
        auth.MapGet("/me", Me).RequireAuthorization(AuthSettings.Admin)
            .WithSummary("Get the current administrator")
            .Produces<AccountResponse>().Produces(401).Produces(403).Produces(503);
    }

    private static async Task<IResult> SetupStatus(AuthSettings settings, PortfolioDbContext db, CancellationToken ct) =>
        Results.Ok(new SetupResponse(settings.SetupConfigured && !await db.AdminSetups.AnyAsync(ct)));

    private static async Task<IResult> Signup(
        Credentials input, HttpContext context, AuthSettings settings, PortfolioDbContext db,
        UserManager<IdentityUser> users, RoleManager<IdentityRole> roles, TimeProvider time, CancellationToken ct)
    {
        if (!ValidCredentials(input, signup: true)) return InvalidInput();
        if (!settings.AllowsSetup(context.Request.Headers["X-Portfolio-Setup"].ToString())) return Results.StatusCode(403);

        await using var transaction = await LockAuth(db, ct);
        if (await db.AdminSetups.AnyAsync(ct)) return Results.Conflict(new CredentialError("Setup is closed."));

        var email = input.Email!.Trim();
        var user = new IdentityUser { UserName = email, Email = email };
        if (!(await users.CreateAsync(user, input.Password!)).Succeeded) return InvalidInput();
        if (!await roles.RoleExistsAsync(AuthSettings.Admin) &&
            !(await roles.CreateAsync(new IdentityRole(AuthSettings.Admin))).Succeeded)
        {
            return Results.Problem();
        }
        if (!(await users.AddToRoleAsync(user, AuthSettings.Admin)).Succeeded) return Results.Problem();

        db.AdminSetups.Add(new AdminSetup());
        var now = time.GetUtcNow();
        var (session, token) = NewSession(db, user.Id, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return SessionResponse(context, settings, session, token, now);
    }

    private static async Task<IResult> Login(
        Credentials input, HttpContext context, AuthSettings settings, PortfolioDbContext db,
        UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn, DummyPassword dummy,
        TimeProvider time, CancellationToken ct)
    {
        if (!ValidCredentials(input, signup: false)) return InvalidInput();
        var user = await users.FindByEmailAsync(input.Email!.Trim());
        if (user is null)
        {
            dummy.Verify(input.Password!);
            return InvalidLogin();
        }
        if (!(await signIn.CheckPasswordSignInAsync(user, input.Password!, lockoutOnFailure: true)).Succeeded ||
            !await users.IsInRoleAsync(user, AuthSettings.Admin))
        {
            return InvalidLogin();
        }

        var now = time.GetUtcNow();
        await using var transaction = await LockAuth(db, ct);
        var oldCredential = await FindRefresh(context, db, ct);
        if (oldCredential is not null) oldCredential.Session.RevokedAt ??= now;
        var (session, token) = NewSession(db, user.Id, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return SessionResponse(context, settings, session, token, now);
    }

    private static async Task<IResult> Refresh(
        HttpContext context, AuthSettings settings, PortfolioDbContext db, UserManager<IdentityUser> users,
        TimeProvider time, CancellationToken ct)
    {
        if (!TryReadRefresh(context, out _)) return Results.Unauthorized();
        await using var transaction = await LockAuth(db, ct);
        var credential = await FindRefresh(context, db, ct);
        var now = time.GetUtcNow();
        if (credential is null || credential.Session.RevokedAt is not null || credential.Session.ExpiresAt <= now)
        {
            ClearCookie(context);
            return Results.Unauthorized();
        }

        var user = await users.FindByIdAsync(credential.Session.UserId);
        if (credential.UsedAt is not null || user is null || !await users.IsInRoleAsync(user, AuthSettings.Admin))
        {
            credential.Session.RevokedAt = now;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            ClearCookie(context);
            return Results.Unauthorized();
        }
        credential.UsedAt = now;
        var token = AddRefresh(db, credential.Session);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return SessionResponse(context, settings, credential.Session, token, now);
    }

    private static async Task<IResult> Logout(HttpContext context, PortfolioDbContext db, TimeProvider time, CancellationToken ct)
    {
        if (TryReadRefresh(context, out _))
        {
            await using var transaction = await LockAuth(db, ct);
            var credential = await FindRefresh(context, db, ct);
            if (credential is not null)
            {
                credential.Session.RevokedAt ??= time.GetUtcNow();
                await db.SaveChangesAsync(ct);
            }
            await transaction.CommitAsync(ct);
        }
        ClearCookie(context);
        return Results.NoContent();
    }

    private static async Task<IResult> Me(ClaimsPrincipal principal, UserManager<IdentityUser> users)
    {
        var user = await users.FindByIdAsync(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        return user is null || !await users.IsInRoleAsync(user, AuthSettings.Admin)
            ? Results.Forbid()
            : Results.Ok(new AccountResponse(user.Id, user.Email, AuthSettings.Admin));
    }

    private static async Task<IDbContextTransaction> LockAuth(PortfolioDbContext db, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource = N'Portfolio.Auth.Write',
                    @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
                IF @result < 0 THROW 51001, 'Portfolio authentication lock unavailable.', 1;
                """, ct);
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private static (AuthSession Session, string Token) NewSession(PortfolioDbContext db, string userId, DateTimeOffset now)
    {
        var session = new AuthSession { UserId = userId, ExpiresAt = now.Add(AuthSettings.RefreshLifetime) };
        db.AuthSessions.Add(session);
        return (session, AddRefresh(db, session));
    }

    private static string AddRefresh(PortfolioDbContext db, AuthSession session)
    {
        var token = AuthTokens.NewRefreshToken();
        db.RefreshCredentials.Add(new RefreshCredential { Hash = AuthTokens.Hash(token), Session = session, SessionId = session.Id });
        return token;
    }

    private static bool TryReadRefresh(HttpContext context, out string value)
    {
        value = context.Request.Cookies[AuthSettings.Cookie] ?? "";
        return value.Length == 64 && value.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_');
    }

    private static Task<RefreshCredential?> FindRefresh(HttpContext context, PortfolioDbContext db, CancellationToken ct) =>
        TryReadRefresh(context, out var token)
            ? db.RefreshCredentials.Include(credential => credential.Session)
                .SingleOrDefaultAsync(credential => credential.Hash == AuthTokens.Hash(token), ct)
            : Task.FromResult<RefreshCredential?>(null);

    private static IResult SessionResponse(HttpContext context, AuthSettings settings, AuthSession session, string token, DateTimeOffset now)
    {
        context.Response.Cookies.Append(AuthSettings.Cookie, token, AuthTokens.CookieOptions(session.ExpiresAt));
        return Results.Ok(AuthTokens.Issue(settings, session, now));
    }

    private static void ClearCookie(HttpContext context) =>
        context.Response.Cookies.Delete(AuthSettings.Cookie, AuthTokens.CookieOptions());

    private static bool ValidCredentials(Credentials input, bool signup) =>
        input.Email is { Length: > 0 and <= 254 } email && new EmailAddressAttribute().IsValid(email.Trim()) &&
        input.Password is { Length: <= AuthSettings.MaximumPasswordLength } password &&
        password.Length >= (signup ? AuthSettings.MinimumSignupPasswordLength : 1);

    private static IResult InvalidInput() => Results.BadRequest(new CredentialError("Check the email and password requirements."));
    private static IResult InvalidLogin() => Results.Json(new CredentialError("Invalid email or password."), statusCode: 401);
}

internal sealed record Credentials(string? Email, string? Password);
internal sealed record SetupResponse(bool SetupRequired);
internal sealed record AccountResponse(string Id, string? Email, string Role);
internal sealed record CredentialError(string Message);

internal sealed class DummyPassword
{
    private readonly IdentityUser user = new();
    private readonly PasswordHasher<IdentityUser> hasher;
    private readonly string hash;

    public DummyPassword(IOptions<PasswordHasherOptions> options)
    {
        hasher = new PasswordHasher<IdentityUser>(options);
        hash = hasher.HashPassword(user, Guid.NewGuid().ToString("N"));
    }

    public void Verify(string password) => hasher.VerifyHashedPassword(user, hash, password);
}
