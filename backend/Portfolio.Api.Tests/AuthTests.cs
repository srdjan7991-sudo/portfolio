using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Portfolio.Api.Auth;
using Portfolio.Api.Data;
using Portfolio.Api.Sections;
using Xunit;

namespace Portfolio.Api.Tests;

public sealed class AuthTests
{
    [Fact]
    public async Task Refresh_and_logout_handle_missing_or_malformed_cookies_without_sql()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        foreach (var cookie in new[] { null, "__Secure-portfolio-refresh=too-short" })
        {
            using var refresh = await Send(client, "refresh", cookie: cookie);
            Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
            Assert.True(refresh.Headers.CacheControl?.NoStore);
            Assert.False(refresh.Headers.Contains("Set-Cookie"));

            using var logout = await Send(client, "logout", cookie: cookie);
            Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
            Assert.True(logout.Headers.CacheControl?.NoStore);
            Assert.Equal("__Secure-portfolio-refresh=", RefreshCookie(logout));
        }
    }

    [Fact]
    public async Task Password_requirements_match_identity_without_weakening_setup_validation()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        Assert.Equal(15, app.Services.GetRequiredService<IOptions<IdentityOptions>>().Value.Password.RequiredLength);
        Assert.Equal(210_000, app.Services.GetRequiredService<IOptions<PasswordHasherOptions>>().Value.IterationCount);

        using var tooShort = await Send(client, "signup", new { email = "a@example.com", password = new string('a', 14) });
        using var minimum = await Send(client, "signup", new { email = "a@example.com", password = new string('a', 15) });
        using var tooLong = await Send(client, "signup", new { email = "a@example.com", password = new string('a', 129) });
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, minimum.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    [Fact]
    public async Task Database_dependent_auth_routes_return_an_uncached_service_unavailable_problem()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        var now = DateTime.UtcNow;
        var token = app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1));
        const string email = "admin@example.com";
        var cookie = "__Secure-portfolio-refresh=" + new string('a', 64);
        using var status = await client.GetAsync("/api/auth/setup-status");
        using var signup = await Send(client, "signup", Credentials(email), setup: app.SetupKey);
        using var login = await Send(client, "login", Credentials(email));
        using var refresh = await Send(client, "refresh", cookie: cookie);
        using var logout = await Send(client, "logout", cookie: cookie);
        using var me = await Me(client, token);

        foreach (var response in new[] { status, signup, login, refresh, logout, me })
        {
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            Assert.True(response.Headers.CacheControl?.NoStore);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(503, body.RootElement.GetProperty("status").GetInt32());
        }
        using var order = await SaveOrder(client, DefaultSectionOrder, token);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, order.StatusCode);
        Assert.Equal("application/problem+json", order.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Disabled_auth_returns_an_uncached_service_unavailable_problem()
    {
        using var app = new AuthApplication(authEnabled: false);
        using var client = app.Client();
        using var response = await client.GetAsync("/api/auth/setup-status");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Production_keeps_swagger_off_and_requires_authentication_for_account_details()
    {
        using var app = new AuthApplication();
        using var production = app.WithWebHostBuilder(builder => builder.UseEnvironment("Production"));
        using var client = production.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        using var swagger = await client.GetAsync("/swagger/v1/swagger.json");
        using var account = await Me(client);
        Assert.Equal(HttpStatusCode.NotFound, swagger.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, account.StatusCode);
    }

    [Fact]
    public async Task Guard_rejects_missing_or_wrong_origin_and_invalid_input()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        using var missing = await client.PostAsJsonAsync("/api/auth/login", new { email = "a@example.com", password = "password" });
        Assert.Equal(HttpStatusCode.Forbidden, missing.StatusCode);
        using var bad = await Send(client, "login", new { email = "not-an-email", password = "" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        using var wrong = await Send(client, "refresh", origin: "https://different.example");
        Assert.Equal(HttpStatusCode.Forbidden, wrong.StatusCode);
        using var missingGuard = await Send(client, "logout", guard: false);
        Assert.Equal(HttpStatusCode.Forbidden, missingGuard.StatusCode);
    }

    [Fact]
    public async Task Missing_invalid_expired_or_wrong_audience_jwt_is_rejected()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        using var unauthorized = await Me(client);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);
        var now = DateTime.UtcNow;
        foreach (var token in new[]
        {
            "not-a-jwt",
            app.CreateToken(RandomNumberGenerator.GetBytes(32), now.AddMinutes(-2), now.AddMinutes(1)),
            app.CreateToken(app.SigningKey, now.AddMinutes(-6), now.AddMinutes(-1)),
            app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1), audience: "wrong-audience"),
            app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1), issuer: "wrong-issuer"),
            app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1), algorithm: SecurityAlgorithms.HmacSha384),
        })
        {
            using var response = await Me(client, token);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [Fact]
    public async Task Login_attempts_are_rate_limited()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        for (var attempt = 0; attempt < 10; attempt++)
        {
            using var invalid = await Send(client, "login", new { email = "invalid", password = "" });
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        }
        using var limited = await Send(client, "login", new { email = "invalid", password = "" });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
    }

    [Fact]
    public async Task Session_and_setup_limits_keep_a_separate_budget_from_login()
    {
        using var app = new AuthApplication(setupEnabled: false);
        using var client = app.Client();
        for (var attempt = 0; attempt < 30; attempt++)
        {
            using var status = await client.GetAsync("/api/auth/setup-status");
            using var refresh = await Send(client, "refresh");
            using var logout = await Send(client, "logout");
            Assert.Equal(HttpStatusCode.OK, status.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        }

        using var limitedStatus = await client.GetAsync("/api/auth/setup-status");
        using var limitedRefresh = await Send(client, "refresh");
        using var limitedLogout = await Send(client, "logout");
        using var login = await Send(client, "login", new { email = "invalid", password = "" });
        Assert.Equal(HttpStatusCode.TooManyRequests, limitedStatus.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, limitedRefresh.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, limitedLogout.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, login.StatusCode);
    }

    [Fact]
    public async Task An_incomplete_auth_configuration_rejects_signed_bearers_before_the_database_lookup()
    {
        using var app = new AuthApplication(authEnabled: false);
        using var client = app.Client();
        var now = DateTime.UtcNow;
        var token = app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1));

        using var response = await Me(client, token);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [SqlFact]
    public async Task Sql_server_allows_only_one_signup_across_concurrent_requests()
    {
        await using var fixture = await SqlFixture.Create();
        using var client = fixture.App.Client();
        Assert.True((await client.GetFromJsonAsync<SetupStatus>("/api/auth/setup-status"))!.SetupRequired);
        using var missingKey = await Send(client, "signup", Credentials("owner@example.com"));
        Assert.Equal(HttpStatusCode.Forbidden, missingKey.StatusCode);
        var results = await Task.WhenAll(
            Send(client, "signup", Credentials("owner@example.com"), setup: fixture.App.SetupKey),
            Send(client, "signup", Credentials("second@example.com"), setup: fixture.App.SetupKey));
        try
        {
            Assert.Single(results, response => response.StatusCode == HttpStatusCode.OK);
            Assert.Single(results, response => response.StatusCode == HttpStatusCode.Conflict);
            Assert.False((await client.GetFromJsonAsync<SetupStatus>("/api/auth/setup-status"))!.SetupRequired);
            using var second = await Send(client, "signup", Credentials("third@example.com"), setup: fixture.App.SetupKey);
            Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        }
        finally { foreach (var result in results) result.Dispose(); }
    }

    [SqlFact]
    public async Task Sql_server_locks_out_the_administrator_after_five_failed_password_attempts()
    {
        await using var fixture = await SqlFixture.Create();
        using var client = fixture.App.Client();
        using var signup = await Send(client, "signup", Credentials("owner@example.com"), setup: fixture.App.SetupKey);
        Assert.Equal(HttpStatusCode.OK, signup.StatusCode);
        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var wrong = await Send(client, "login", new { email = "owner@example.com", password = "wrong" });
            Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        }
        using var locked = await Send(client, "login", Credentials("owner@example.com"));
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
    }

    [SqlFact]
    public async Task Sql_server_login_rotation_replay_logout_and_role_checks()
    {
        await using var fixture = await SqlFixture.Create();
        var app = fixture.App;
        using var client = app.Client();
        const string email = "o'neil@example.com";
        using var signup = await Send(client, "signup", Credentials(email), setup: app.SetupKey);
        Assert.Equal(HttpStatusCode.OK, signup.StatusCode);
        using var wrong = await Send(client, "login", new { email, password = "wrong" });
        using var missing = await Send(client, "login", new { email = "missing@example.com", password = "wrong" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(await wrong.Content.ReadAsStringAsync(), await missing.Content.ReadAsStringAsync());
        using var login = await Send(client, "login", Credentials(email));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = RefreshCookie(login);
        var access = (await login.Content.ReadFromJsonAsync<Access>())!.AccessToken;
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(access);
        Assert.Equal("portfolio-api", jwt.Issuer);
        Assert.Contains("portfolio-admin", jwt.Audiences);
        Assert.InRange(jwt.ValidTo - jwt.ValidFrom, TimeSpan.FromMinutes(4), TimeSpan.FromMinutes(5));
        Assert.NotEmpty(jwt.Id);
        Assert.NotNull(jwt.Claims.Single(claim => claim.Type == JwtRegisteredClaimNames.Iat));
        using var me = await Me(client, access);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var now = DateTime.UtcNow;
        var noRole = app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1),
            subject: jwt.Subject, session: jwt.Claims.Single(claim => claim.Type == "sid").Value);
        using var forbidden = await Me(client, noRole);
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var newToken = await Send(client, "refresh", cookie: cookie);
        Assert.Equal(HttpStatusCode.OK, newToken.StatusCode);
        var rotatedCookie = RefreshCookie(newToken);
        Assert.NotEqual(cookie, rotatedCookie);
        using var replay = await Send(client, "refresh", cookie: cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
        using var revoked = await Send(client, "refresh", cookie: rotatedCookie);
        Assert.Equal(HttpStatusCode.Unauthorized, revoked.StatusCode);
        using var revokedAccess = await Me(client, access);
        Assert.Equal(HttpStatusCode.Unauthorized, revokedAccess.StatusCode);

        using var nextLogin = await Send(client, "login", Credentials(email));
        Assert.Equal(HttpStatusCode.OK, nextLogin.StatusCode);
        var nextCookie = RefreshCookie(nextLogin);
        using var logout = await Send(client, "logout", cookie: nextCookie);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Contains("expires=", logout.Headers.GetValues("Set-Cookie").Single(), StringComparison.OrdinalIgnoreCase);
        using var afterLogout = await Send(client, "refresh", cookie: nextCookie);
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    [Fact]
    public async Task Anonymous_call_cannot_set_section_order()
    {
        using var app = new AuthApplication();
        using var client = app.Client();
        using var response = await SaveOrder(client, DefaultSectionOrder);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [SqlFact]
    public async Task Sql_server_explicit_sign_in_recovers_from_a_lost_refresh_response()
    {
        await using var fixture = await SqlFixture.Create();
        var app = fixture.App;
        using var client = app.Client();
        const string email = "admin@example.com";
        using var signup = await Send(client, "signup", Credentials(email), setup: app.SetupKey);
        Assert.Equal(HttpStatusCode.OK, signup.StatusCode);
        var originalCookie = RefreshCookie(signup);
        var originalAccess = (await signup.Content.ReadFromJsonAsync<Access>())!.AccessToken;

        // The refresh commits, but the browser keeps its previous cookie.
        using var discardedResponse = await Send(client, "refresh", cookie: originalCookie);
        Assert.Equal(HttpStatusCode.OK, discardedResponse.StatusCode);
        Assert.NotEqual(originalCookie, RefreshCookie(discardedResponse));
        var discardedAccess = (await discardedResponse.Content.ReadFromJsonAsync<Access>())!.AccessToken;

        using var login = await Send(client, "login", Credentials(email), cookie: originalCookie);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.NotEqual(originalCookie, RefreshCookie(login));
        var recoveredAccess = (await login.Content.ReadFromJsonAsync<Access>())!.AccessToken;
        using var me = await Me(client, recoveredAccess);
        using var original = await Me(client, originalAccess);
        using var discarded = await Me(client, discardedAccess);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, original.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, discarded.StatusCode);
    }

    [SqlFact]
    public async Task Sql_server_operator_recovery_keeps_signup_closed_and_revokes_existing_sessions()
    {
        await using var fixture = await SqlFixture.Create();
        var app = fixture.App;
        using var client = app.Client();
        const string email = "admin@example.com";
        const string newPassword = "a different test passphrase";
        Assert.False(await AdminRecovery.ResetAsync(app.Services, email, newPassword));

        using var signup = await Send(client, "signup", Credentials(email), setup: app.SetupKey);
        Assert.Equal(HttpStatusCode.OK, signup.StatusCode);
        using var login = await Send(client, "login", Credentials(email));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var priorAccess = (await login.Content.ReadFromJsonAsync<Access>())!.AccessToken;

        await using (var scope = app.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            var user = await users.FindByEmailAsync(email);
            Assert.NotNull(user);
            Assert.True((await users.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(15))).Succeeded);
        }
        Assert.False(await AdminRecovery.ResetAsync(app.Services, "missing@example.com", newPassword));
        Assert.True(await AdminRecovery.ResetAsync(app.Services, email, newPassword));

        using var expiredAccess = await Me(client, priorAccess);
        using var expiredRefresh = await Send(client, "refresh", cookie: RefreshCookie(signup));
        using var oldPassword = await Send(client, "login", Credentials(email));
        using var recoveredLogin = await Send(client, "login", new { email, password = newPassword });
        using var status = await client.GetAsync("/api/auth/setup-status");
        using var closed = await Send(client, "signup", Credentials(email), setup: app.SetupKey);
        Assert.Equal(HttpStatusCode.Unauthorized, expiredAccess.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, expiredRefresh.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);
        Assert.Equal(HttpStatusCode.OK, recoveredLogin.StatusCode);
        Assert.False((await status.Content.ReadFromJsonAsync<SetupStatus>())!.SetupRequired);
        Assert.Equal(HttpStatusCode.Conflict, closed.StatusCode);
    }

    [SqlFact]
    public async Task Sql_server_validates_and_atomically_persists_section_order()
    {
        await using var fixture = await SqlFixture.Create();
        var app = fixture.App;
        using var client = app.Client();
        using var signup = await Send(client, "signup", Credentials("owner@example.com"), setup: app.SetupKey);
        var access = (await signup.Content.ReadFromJsonAsync<Access>())!.AccessToken;
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(access);
        var now = DateTime.UtcNow;
        var nonAdmin = app.CreateToken(app.SigningKey, now.AddMinutes(-1), now.AddMinutes(1),
            subject: jwt.Subject, session: jwt.Claims.Single(claim => claim.Type == "sid").Value);
        using var denied = await SaveOrder(client, DefaultSectionOrder, nonAdmin);
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PortfolioDbContext>();
        db.Sections.Add(new Portfolio.Api.Sections.PortfolioSection
        {
            Key = "work", Title = "Existing title", Body = "Existing body", IsEnabled = false, SortOrder = 8,
        });
        await db.SaveChangesAsync();

        foreach (var invalid in new[]
        {
            DefaultSectionOrder.Skip(1).ToArray(),
            DefaultSectionOrder.SkipLast(1).Append("work").ToArray(),
            DefaultSectionOrder.Prepend("top").ToArray(),
            DefaultSectionOrder.SkipLast(1).Append("top").ToArray(),
            DefaultSectionOrder.SkipLast(1).Append("header").ToArray(),
            DefaultSectionOrder.SkipLast(1).Append("footer").ToArray(),
            DefaultSectionOrder.SkipLast(1).Append("unknown").ToArray(),
        })
        {
            using var rejected = await SaveOrder(client, invalid, access);
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        }
        Assert.Equal(DefaultSectionOrder, (await client.GetFromJsonAsync<OrderResponse>("/api/sections/order"))!.Keys);

        for (var index = 1; index < DefaultSectionOrder.Length; index++)
            db.Sections.Add(new Portfolio.Api.Sections.PortfolioSection
            {
                Key = DefaultSectionOrder[index], Title = "Existing section", Body = "", SortOrder = index,
            });
        db.Sections.Add(new Portfolio.Api.Sections.PortfolioSection
        {
            Key = "top", Title = "Existing hero", Body = "Hero body", IsEnabled = true, SortOrder = 55,
        });
        await db.SaveChangesAsync();
        var previous = DefaultSectionOrder.Skip(1).Append("work").ToArray();
        Assert.Equal(previous, (await client.GetFromJsonAsync<OrderResponse>("/api/sections/order"))!.Keys);

        string[] saved = ["skills", "work", ..DefaultSectionOrder.Skip(2)];
        using var success = await SaveOrder(client, saved, access, previous);
        Assert.Equal(HttpStatusCode.OK, success.StatusCode);
        using var conflict = await SaveOrder(client, DefaultSectionOrder, access, previous);
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Equal(saved, (await conflict.Content.ReadFromJsonAsync<OrderResponse>())!.Keys);
        Assert.Equal(saved, (await client.GetFromJsonAsync<OrderResponse>("/api/sections/order"))!.Keys);
        var preserved = await db.Sections.AsNoTracking().SingleAsync(section => section.Key == "work");
        Assert.Equal("Existing title", preserved.Title);
        Assert.Equal("Existing body", preserved.Body);
        Assert.False(preserved.IsEnabled);
        var hero = await db.Sections.AsNoTracking().SingleAsync(section => section.Key == "top");
        Assert.Equal(55, hero.SortOrder);
        Assert.Equal("Hero body", hero.Body);

        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE dbo.Sections ADD CONSTRAINT CK_Test_SectionOrder
                CHECK ([Key] <> N'work' OR [SortOrder] <> 5);
            """);
        using var failed = await SaveOrder(client, DefaultSectionOrder.Reverse().ToArray(), access);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, failed.StatusCode);
        Assert.Equal(saved, (await client.GetFromJsonAsync<OrderResponse>("/api/sections/order"))!.Keys);
    }

    [SqlFact]
    public async Task Sql_server_lists_enabled_sections_in_display_order_with_the_public_response_shape()
    {
        await using var fixture = await SqlFixture.Create();
        using var client = fixture.App.Client();
        var empty = await client.GetFromJsonAsync<JsonElement>("/api/sections");
        Assert.Empty(empty.EnumerateArray());

        await using var scope = fixture.App.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PortfolioDbContext>();
        db.Sections.AddRange(
            new PortfolioSection { Key = "zulu", Title = "Later title", Body = "Later body", IsEnabled = true, SortOrder = 10 },
            new PortfolioSection { Key = "hidden", Title = "Hidden title", Body = "Hidden body", IsEnabled = false, SortOrder = 0 },
            new PortfolioSection { Key = "alpha", Title = "Earlier title", Body = "Earlier body", IsEnabled = true, SortOrder = 10 },
            new PortfolioSection { Key = "work", Title = "Selected Work", Body = "", IsEnabled = true, SortOrder = 2 });
        await db.SaveChangesAsync();

        using var response = await client.GetAsync("/api/sections");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Collection(body.RootElement.EnumerateArray(),
            section => AssertPublicSection(section, "work", "Selected Work", ""),
            section => AssertPublicSection(section, "alpha", "Earlier title", "Earlier body"),
            section => AssertPublicSection(section, "zulu", "Later title", "Later body"));
    }

    [SqlFact]
    public async Task Sql_server_first_order_save_publishes_title_only_rows_for_missing_sections()
    {
        await using var fixture = await SqlFixture.Create();
        var app = fixture.App;
        using var client = app.Client();
        var before = await client.GetFromJsonAsync<JsonElement>("/api/sections");
        Assert.Empty(before.EnumerateArray());
        using var signup = await Send(client, "signup", Credentials("admin@example.com"), setup: app.SetupKey);
        Assert.Equal(HttpStatusCode.OK, signup.StatusCode);
        var access = (await signup.Content.ReadFromJsonAsync<Access>())!.AccessToken;
        string[] order = ["expertise", "experience", "work", "skills", "education", "contact"];
        using var saved = await SaveOrder(client, order, access, DefaultSectionOrder);
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal(order, (await saved.Content.ReadFromJsonAsync<OrderResponse>())!.Keys);

        var published = await client.GetFromJsonAsync<JsonElement>("/api/sections");
        Assert.Collection(published.EnumerateArray(),
            section => AssertPublicSection(section, "expertise", "How I Engineer", ""),
            section => AssertPublicSection(section, "experience", "Professional Experience", ""),
            section => AssertPublicSection(section, "work", "Selected Work", ""),
            section => AssertPublicSection(section, "skills", "Technical Skills", ""),
            section => AssertPublicSection(section, "education", "Education & Certifications", ""),
            section => AssertPublicSection(section, "contact", "Contact", ""));
    }

    private static void AssertPublicSection(JsonElement section, string key, string title, string body)
    {
        Assert.Equal(3, section.EnumerateObject().Count());
        Assert.Equal(key, section.GetProperty("key").GetString());
        Assert.Equal(title, section.GetProperty("title").GetString());
        Assert.Equal(body, section.GetProperty("body").GetString());
    }

    private static readonly string[] DefaultSectionOrder = ["work", "skills", "expertise", "experience", "education", "contact"];
    private sealed record OrderResponse(string[] Keys);

    private static async Task<HttpResponseMessage> SaveOrder(HttpClient client, string[] keys,
        string? access = null, string[]? expectedKeys = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/api/sections/order");
        if (access is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", access);
        request.Content = JsonContent.Create(new { keys, expectedKeys });
        return await client.SendAsync(request);
    }

    private static object Credentials(string email) => new { email, password = "a long test passphrase" };

    private static async Task<HttpResponseMessage> Send(HttpClient client, string route, object? body = null,
        string? setup = null, string? cookie = null, string origin = AuthApplication.Origin, bool guard = true)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/" + route);
        request.Headers.Add("Origin", origin);
        if (guard) request.Headers.Add("X-Portfolio-Auth", "1");
        if (setup is not null) request.Headers.Add("X-Portfolio-Setup", setup);
        if (cookie is not null) request.Headers.Add("Cookie", cookie);
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> Me(HttpClient client, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.SendAsync(request);
    }

    private static string RefreshCookie(HttpResponseMessage response)
    {
        var header = response.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("; secure", header, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("; httponly", header, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("; samesite=strict", header, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("; path=/api/auth", header, StringComparison.OrdinalIgnoreCase);
        return header.Split(';')[0];
    }

    private sealed record Access(string AccessToken);
    private sealed record SetupStatus(bool SetupRequired);

    private sealed class AuthApplication(string? connection = null, bool authEnabled = true, bool setupEnabled = true) : WebApplicationFactory<Program>
    {
        public const string Origin = "https://localhost:5173";
        public byte[] SigningKey { get; } = RandomNumberGenerator.GetBytes(48);
        public string SetupKey { get; } = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        public HttpClient Client() => CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri(Origin), HandleCookies = false, AllowAutoRedirect = false
        });

        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Portfolio"] = connection ?? "",
                    ["Auth:Origin"] = authEnabled ? Origin : null,
                    ["Auth:SigningKey"] = Convert.ToBase64String(SigningKey),
                    ["Auth:SetupKey"] = setupEnabled ? SetupKey : null,
                }));

        public string CreateToken(byte[] key, DateTime start, DateTime end, string audience = "portfolio-admin",
            string issuer = "portfolio-api", string algorithm = SecurityAlgorithms.HmacSha256,
            string subject = "test", string? session = null)
        {
            var token = new JwtSecurityToken(issuer, audience,
                [
                    new Claim("sub", subject),
                    new Claim("jti", Guid.NewGuid().ToString("N")),
                    new Claim("iat", new DateTimeOffset(start).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                    new Claim("sid", session ?? Guid.NewGuid().ToString()),
                ], start, end, new SigningCredentials(new SymmetricSecurityKey(key), algorithm));
            token.Header["typ"] = "at+jwt";
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    private sealed class SqlFixture : IAsyncDisposable
    {
        public required AuthApplication App { get; init; }

        public static async Task<SqlFixture> Create()
        {
            var settings = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PORTFOLIO_TEST_SQL"))
            {
                InitialCatalog = "PortfolioAuthTests_" + Guid.NewGuid().ToString("N"),
                Pooling = false,
            };
            var fixture = new SqlFixture { App = new AuthApplication(settings.ConnectionString) };
            try
            {
                await using var scope = fixture.App.Services.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<PortfolioDbContext>().Database.MigrateAsync();
                return fixture;
            }
            catch { await fixture.DisposeAsync(); throw; }
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                await using var scope = App.Services.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<PortfolioDbContext>();
                var name = db.Database.GetDbConnection().Database;
                if (name.StartsWith("PortfolioAuthTests_", StringComparison.Ordinal))
                    await db.Database.EnsureDeletedAsync();
            }
            finally { await App.DisposeAsync(); }
        }
    }

    public sealed class SqlFactAttribute : FactAttribute
    {
        public SqlFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PORTFOLIO_TEST_SQL")))
                Skip = "Set PORTFOLIO_TEST_SQL to run isolated SQL Server integration tests.";
        }
    }
}
