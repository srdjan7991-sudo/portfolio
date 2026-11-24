using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Portfolio.Api.Tests;

public sealed class ApiTests : IDisposable
{
    private readonly WebApplicationFactory<Program> application = new TestApplication();

    [Fact]
    public async Task Health_is_available_without_a_database()
    {
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("healthy", body.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Sections_returns_a_service_unavailable_problem_when_database_is_unconfigured()
    {
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/api/sections");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(503, body.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Section_order_returns_an_uncached_problem_when_database_is_unconfigured()
    {
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/api/sections/order");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("The portfolio section order is temporarily unavailable.",
            body.RootElement.GetProperty("title").GetString());
        Assert.Equal(503, body.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Development_OpenAPI_describes_public_reads_and_the_protected_order_write()
    {
        using var body = await ReadDevelopmentOpenApi();
        var paths = body.RootElement.GetProperty("paths");
        var readSections = paths.GetProperty("/api/sections").GetProperty("get");
        var order = paths.GetProperty("/api/sections/order");
        var readOrder = order.GetProperty("get");
        var writeOrder = order.GetProperty("put");
        foreach (var read in new[] { readSections, readOrder })
        {
            Assert.False(read.TryGetProperty("security", out _));
            var responses = read.GetProperty("responses");
            Assert.True(responses.TryGetProperty("200", out _));
            AssertUnavailableProblem(read);
        }

        var sectionsSchema = readSections.GetProperty("responses").GetProperty("200").GetProperty("content")
            .GetProperty("application/json").GetProperty("schema");
        Assert.Equal("array", sectionsSchema.GetProperty("type").GetString());
        var rowSchema = sectionsSchema.GetProperty("items");
        if (rowSchema.TryGetProperty("$ref", out var reference))
        {
            var schemaName = reference.GetString()!.Split('/')[^1];
            rowSchema = body.RootElement.GetProperty("components").GetProperty("schemas").GetProperty(schemaName);
        }
        var rowProperties = rowSchema.GetProperty("properties");
        foreach (var property in new[] { "key", "title", "body" })
            Assert.Equal("string", rowProperties.GetProperty(property).GetProperty("type").GetString());

        Assert.True(writeOrder.GetProperty("security")[0].TryGetProperty("Bearer", out _));
        Assert.True(writeOrder.GetProperty("requestBody").GetProperty("required").GetBoolean());
        var writeResponses = writeOrder.GetProperty("responses");
        foreach (var status in new[] { "200", "400", "401", "403", "409" })
            Assert.True(writeResponses.TryGetProperty(status, out _), $"Missing PUT response {status}.");
        AssertUnavailableProblem(writeOrder);
    }

    [Fact]
    public async Task Development_OpenAPI_describes_auth_guard_headers_and_reserves_the_setup_header_for_signup()
    {
        using var body = await ReadDevelopmentOpenApi();
        var paths = body.RootElement.GetProperty("paths");
        foreach (var route in new[] { "signup", "login", "refresh", "logout" })
        {
            var operation = paths.GetProperty($"/api/auth/{route}").GetProperty("post");
            AssertUnavailableProblem(operation);
            var parameters = operation.GetProperty("parameters").EnumerateArray().ToArray();
            var guard = Assert.Single(parameters, parameter => parameter.GetProperty("name").GetString() == "X-Portfolio-Auth");
            AssertRequiredStringHeader(guard);

            var setup = parameters.Where(parameter => parameter.GetProperty("name").GetString() == "X-Portfolio-Setup");
            if (route == "signup") AssertRequiredStringHeader(Assert.Single(setup));
            else Assert.Empty(setup);
        }
        AssertUnavailableProblem(paths.GetProperty("/api/auth/setup-status").GetProperty("get"));
        AssertUnavailableProblem(paths.GetProperty("/api/auth/me").GetProperty("get"));
    }

    [Theory]
    [InlineData("Development", null, "127.0.0.1", "198.51.100.42")]
    [InlineData("Development", null, "192.0.2.20", "192.0.2.20")]
    [InlineData("Production", null, "127.0.0.1", "127.0.0.1")]
    [InlineData("Production", "192.0.2.10", "192.0.2.10", "198.51.100.42")]
    [InlineData("Production", "192.0.2.10", "192.0.2.20", "192.0.2.20")]
    public async Task Forwarded_client_address_requires_an_explicitly_trusted_peer(
        string environment, string? configuredProxy, string peer, string expectedAddress)
    {
        using var host = application.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            if (configuredProxy is not null)
                builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                    new Dictionary<string, string?> { ["ReverseProxy:KnownProxies:0"] = configuredProxy }));
        });
        var exchange = await host.Server.SendAsync(context =>
        {
            context.Request.Method = "GET";
            context.Request.Path = "/health";
            context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.42";
        });
        Assert.Equal(200, exchange.Response.StatusCode);
        Assert.Equal(IPAddress.Parse(expectedAddress), exchange.Connection.RemoteIpAddress);
    }

    private static void AssertUnavailableProblem(JsonElement operation)
    {
        var content = operation.GetProperty("responses").GetProperty("503").GetProperty("content");
        Assert.True(content.TryGetProperty("application/problem+json", out _));
    }

    private async Task<JsonDocument> ReadDevelopmentOpenApi()
    {
        using var development = application.WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = development.CreateClient();
        using var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private static void AssertRequiredStringHeader(JsonElement parameter)
    {
        Assert.Equal("header", parameter.GetProperty("in").GetString());
        Assert.True(parameter.GetProperty("required").GetBoolean());
        Assert.Equal("string", parameter.GetProperty("schema").GetProperty("type").GetString());
    }

    public void Dispose() => application.Dispose();

    private sealed class TestApplication : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?> { ["ConnectionStrings:Portfolio"] = "" }));
    }
}
