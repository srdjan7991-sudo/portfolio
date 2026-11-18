namespace Portfolio.Api.Auth;

internal sealed class AdminSetup
{
    public int Id { get; init; } = 1;
}

internal sealed class AuthSession
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string UserId { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
    public DateTimeOffset? RevokedAt { get; set; }
}

internal sealed class RefreshCredential
{
    public required string Hash { get; init; }
    public Guid SessionId { get; init; }
    public required AuthSession Session { get; init; }
    public DateTimeOffset? UsedAt { get; set; }
}
