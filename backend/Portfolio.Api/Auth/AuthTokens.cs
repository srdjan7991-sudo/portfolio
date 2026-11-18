using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Portfolio.Api.Auth;

internal static class AuthTokens
{
    public static string NewRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(48));

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(token)));

    public static TokenResponse Issue(AuthSettings settings, AuthSession session, DateTimeOffset now)
    {
        var claims = new Claim[]
        {
            new(JwtRegisteredClaimNames.Sub, session.UserId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.Iat, now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture), ClaimValueTypes.Integer64),
            new("sid", session.Id.ToString("D")),
            new("role", AuthSettings.Admin),
        };
        var expiration = now.Add(AuthSettings.AccessLifetime);
        if (session.ExpiresAt < expiration) expiration = session.ExpiresAt;
        var token = new JwtSecurityToken(
            AuthSettings.Issuer, AuthSettings.Audience, claims, now.UtcDateTime, expiration.UtcDateTime,
            new SigningCredentials(settings.SigningKey!, SecurityAlgorithms.HmacSha256));
        token.Header["typ"] = AuthSettings.TokenType;
        return new(new JwtSecurityTokenHandler().WriteToken(token), expiration);
    }

    public static CookieOptions CookieOptions(DateTimeOffset? expiration = null) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = AuthSettings.CookiePath,
        Expires = expiration,
        IsEssential = true,
    };
}

internal sealed record TokenResponse(string AccessToken, DateTimeOffset ExpiresAt);
