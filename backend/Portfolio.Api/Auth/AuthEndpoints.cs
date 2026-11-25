using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Portfolio.Api.Data;

namespace Portfolio.Api.Auth;

internal static class AuthEndpoints
{
    public static void MapPortfolioAuth(this WebApplication app)
    {
        var auth = app.MapGroup(AuthSettings.RouteBase).AddEndpointFilter(async (invocation, next) =>
        {
            var context = invocation.HttpContext;
            context.Response.Headers.CacheControl = "no-store";
            var settings = context.RequestServices.GetRequiredService<AuthSettings>();
            if (!settings.Enabled)
                return Results.Problem(title: "Portfolio authentication is unavailable.", statusCode: 503);

            if (HttpMethods.IsPost(context.Request.Method) &&
                (context.Request.Headers.Origin.Count != 1 ||
                 !string.Equals(context.Request.Headers.Origin.ToString(), settings.Origin, StringComparison.Ordinal) ||
                 context.Request.Headers[AuthSettings.GuardHeader].ToString() != AuthSettings.GuardHeaderValue))
            {
                return Results.StatusCode(403);
            }
            return await next(invocation);
        });

        auth.MapGet("/setup-status", SetupStatus).RequireRateLimiting(AuthConfiguration.SetupStatusPolicy)
            .WithSummary("Check whether the first administrator can be created")
            .Produces<SetupResponse>().Produces(429).ProducesProblem(503);
        auth.MapPost(AuthSettings.SignupRoute, Signup).RequireRateLimiting(AuthConfiguration.AttemptsPolicy)
            .WithSummary("Create the first administrator")
            .WithDescription("Requires a valid email, a password of 15–128 characters and the setup code. " +
                "On success, returns an access token and sets the refresh cookie. Status 409 means setup is closed.")
            .Produces<TokenResponse>().Produces<CredentialError>(400).Produces(403)
            .Produces<CredentialError>(409).Produces(429).ProducesProblem(500).ProducesProblem(503);
        auth.MapPost("/login", Login).RequireRateLimiting(AuthConfiguration.AttemptsPolicy)
            .WithSummary("Sign in as the portfolio administrator")
            .WithDescription("Returns an access token and sets the refresh cookie. Incorrect credentials and locked accounts return the same status and message.")
            .Produces<TokenResponse>().Produces<CredentialError>(400).Produces<CredentialError>(401)
            .Produces(403).Produces(429).ProducesProblem(503);
        auth.MapPost("/refresh", Refresh).RequireRateLimiting(AuthConfiguration.RefreshPolicy)
            .WithSummary("Renew the access token")
            .WithDescription($"The browser sends the HttpOnly, Secure, SameSite=Strict refresh cookie scoped to {AuthSettings.CookiePath}. " +
                "A successful response rotates the cookie. Reusing an already rotated token revokes its session.")
            .Produces<TokenResponse>().Produces(401).Produces(403).Produces(429).ProducesProblem(503);
        auth.MapPost("/logout", Logout).RequireRateLimiting(AuthConfiguration.LogoutPolicy)
            .WithSummary("Revoke the session and clear the refresh cookie")
            .WithDescription("The browser sends the refresh cookie. A successful response clears it and has no response body.")
            .Produces(204).Produces(403).Produces(429).ProducesProblem(503);
        auth.MapGet("/me", Me).RequireAuthorization(AuthSettings.Admin)
            .WithSummary("Get the current administrator")
            .Produces<AccountResponse>().Produces(401).Produces(403).ProducesProblem(503);
    }

    private static async Task<IResult> SetupStatus(AuthSettings settings, PortfolioDbContext db, CancellationToken ct)
    {
        if (!settings.SetupConfigured) return Results.Ok(new SetupResponse(false));
        db.RequireConnection();
        return Results.Ok(new SetupResponse(!await db.AdminSetups.AnyAsync(ct)));
    }

    private static async Task<IResult> Signup(
        Credentials input, HttpContext context, AuthSettings settings, PortfolioDbContext db,
        UserManager<IdentityUser> users, RoleManager<IdentityRole> roles, TimeProvider time, CancellationToken ct)
    {
        if (!ValidCredentials(input, signup: true)) return InvalidInput();
        if (!settings.AllowsSetup(context.Request.Headers[AuthSettings.SetupHeader].ToString())) return Results.StatusCode(403);

        await using var transaction = await AuthDatabase.LockWriteAsync(db, ct);
        if (await db.AdminSetups.AnyAsync(ct)) return Results.Conflict(new CredentialError("Setup is closed."));

        var email = input.Email!.Trim();
        var user = new IdentityUser { UserName = Guid.NewGuid().ToString("N"), Email = email };
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
        db.RequireConnection();
        var email = input.Email!.Trim();
        var normalizedEmail = users.NormalizeEmail(email);
        if (!await db.Users.AnyAsync(candidate => candidate.NormalizedEmail == normalizedEmail, ct))
        {
            dummy.Verify(input.Password!);
            return InvalidLogin();
        }

        // Identity reads and updates the failure count during the password check.
        await using var transaction = await AuthDatabase.LockWriteAsync(db, ct);
        var user = await users.FindByEmailAsync(email);
        if (user is null) return InvalidLogin();
        if (!(await signIn.CheckPasswordSignInAsync(user, input.Password!, lockoutOnFailure: true)).Succeeded ||
            !await users.IsInRoleAsync(user, AuthSettings.Admin))
        {
            // A disconnect after password verification must not undo a recorded attempt.
            await transaction.CommitAsync();
            return InvalidLogin();
        }

        var now = time.GetUtcNow();
        var oldCredential = await FindRefresh(db, ReadRefreshHash(context), ct);
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
        var hash = ReadRefreshHash(context);
        if (hash is null) return Results.Unauthorized();
        if (!await HasActiveRefresh(db, hash, time.GetUtcNow(), ct))
        {
            ClearCookie(context);
            return Results.Unauthorized();
        }

        await using var transaction = await AuthDatabase.LockWriteAsync(db, ct);
        var credential = await FindRefresh(db, hash, ct);
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
        var hash = ReadRefreshHash(context);
        if (hash is not null && await HasActiveRefresh(db, hash, time.GetUtcNow(), ct))
        {
            await using var transaction = await AuthDatabase.LockWriteAsync(db, ct);
            var credential = await FindRefresh(db, hash, ct);
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

    private static string? ReadRefreshHash(HttpContext context)
    {
        var value = context.Request.Cookies[AuthSettings.Cookie];
        return value is { Length: 64 } && value.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_')
            ? AuthTokens.Hash(value) : null;
    }

    private static Task<bool> HasActiveRefresh(PortfolioDbContext db, string hash, DateTimeOffset now, CancellationToken ct)
    {
        db.RequireConnection();
        return db.RefreshCredentials.AnyAsync(credential => credential.Hash == hash &&
            credential.Session.RevokedAt == null && credential.Session.ExpiresAt > now, ct);
    }

    private static Task<RefreshCredential?> FindRefresh(PortfolioDbContext db, string? hash, CancellationToken ct) =>
        hash is null ? Task.FromResult<RefreshCredential?>(null) : db.RefreshCredentials
            .Include(credential => credential.Session).SingleOrDefaultAsync(credential => credential.Hash == hash, ct);

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
