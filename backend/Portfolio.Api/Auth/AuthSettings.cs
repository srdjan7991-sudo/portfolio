using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Portfolio.Api.Auth;

internal sealed class AuthSettings(IConfiguration configuration)
{
    public const string Admin = "Admin";
    public const string Issuer = "portfolio-api";
    public const string Audience = "portfolio-admin";
    public const string TokenType = "at+jwt";
    public const string RouteBase = "/api/auth";
    public const string SignupRoute = "/signup";
    public const string GuardHeader = "X-Portfolio-Auth";
    public const string GuardHeaderValue = "1";
    public const string SetupHeader = "X-Portfolio-Setup";
    public const string Cookie = "__Secure-portfolio-refresh";
    public const string CookiePath = RouteBase;
    public const int MinimumSignupPasswordLength = 15;
    public const int MaximumPasswordLength = 128;
    public static readonly TimeSpan AccessLifetime = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(7);

    public SymmetricSecurityKey? SigningKey { get; } = ReadKey(configuration["Auth:SigningKey"]);
    public string? Origin { get; } = ReadOrigin(configuration["Auth:Origin"]);
    private byte[]? SetupKey { get; } = ReadKey(configuration["Auth:SetupKey"])?.Key;
    public bool SetupConfigured => SetupKey is not null;
    public bool Enabled => SigningKey is not null && Origin is not null;

    public bool AllowsSetup(string? value)
    {
        var supplied = ReadKey(value);
        return SetupKey is not null && supplied is not null &&
            CryptographicOperations.FixedTimeEquals(SHA256.HashData(SetupKey), SHA256.HashData(supplied.Key));
    }

    private static SymmetricSecurityKey? ReadKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 256) return null;
        try
        {
            var bytes = Convert.FromBase64String(value);
            return bytes.Length >= 32 ? new SymmetricSecurityKey(bytes) : null;
        }
        catch (FormatException) { return null; }
    }

    private static string? ReadOrigin(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        string.Equals(value, uri.GetLeftPart(UriPartial.Authority), StringComparison.Ordinal)
            ? value : null;
}
