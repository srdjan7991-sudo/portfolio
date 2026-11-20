using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Portfolio.Api.Auth;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Portfolio.Api.Documentation;

internal static class PortfolioSwagger
{
    public static void AddPortfolioSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Portfolio API",
                Version = "v1",
                Description = "Local development API. Auth POST requests require the configured HTTPS frontend origin. " +
                    "Swagger over HTTP can browse the API and send an existing Bearer token, but cannot perform the HTTPS cookie flow."
            });
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Enter a current access token in the Authorize dialog."
            });
            options.OperationFilter<PortfolioAuthOperationFilter>();
        });
    }
}

internal sealed class PortfolioAuthOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (context.ApiDescription.ActionDescriptor.EndpointMetadata.OfType<IAuthorizeData>().Any())
        {
            operation.Security = [new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", context.Document)] = []
            }];
        }

        var path = context.ApiDescription.RelativePath;
        var authPath = AuthSettings.RouteBase.TrimStart('/');
        if (context.ApiDescription.HttpMethod != HttpMethods.Post || path?.StartsWith(authPath + "/", StringComparison.Ordinal) != true)
            return;

        operation.Parameters ??= [];
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = AuthSettings.GuardHeader, In = ParameterLocation.Header, Required = true,
            Description = $"Set to {AuthSettings.GuardHeaderValue}. The browser must also send the configured HTTPS Origin.",
            Schema = new OpenApiSchema { Type = JsonSchemaType.String }
        });
        if (path == authPath + AuthSettings.SignupRoute)
        {
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = AuthSettings.SetupHeader, In = ParameterLocation.Header, Required = true,
                Description = "Private setup code, required only when creating the first administrator.",
                Schema = new OpenApiSchema { Type = JsonSchemaType.String }
            });
        }
    }
}
