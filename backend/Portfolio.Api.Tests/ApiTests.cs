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
        using var development = application.WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = development.CreateClient();
        using var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
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
            Assert.True(responses.TryGetProperty("503", out _));
        }

        Assert.True(writeOrder.GetProperty("security")[0].TryGetProperty("Bearer", out _));
        Assert.True(writeOrder.GetProperty("requestBody").GetProperty("required").GetBoolean());
        var writeResponses = writeOrder.GetProperty("responses");
        foreach (var status in new[] { "200", "400", "401", "403", "503" })
            Assert.True(writeResponses.TryGetProperty(status, out _), $"Missing PUT response {status}.");
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
