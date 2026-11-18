using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Portfolio.Api.Auth;
using Portfolio.Api.Data;
using Portfolio.Api.Documentation;
using Portfolio.Api.Sections;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<SqlUnavailableHandler>();
builder.Services.Configure<ForwardedHeadersOptions>(options => options.ForwardedHeaders = ForwardedHeaders.XForwardedFor);
builder.Services.AddDbContext<PortfolioDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Portfolio")));
builder.AddPortfolioAuth();
if (builder.Environment.IsDevelopment()) builder.Services.AddPortfolioSwagger();

var app = builder.Build();
app.UseExceptionHandler();
app.UseForwardedHeaders();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => TypedResults.Ok(new { Status = "healthy" }))
    .WithSummary("Check whether the API is running");
app.MapPortfolioSections();
app.MapPortfolioAuth();
app.Run();

public partial class Program;
