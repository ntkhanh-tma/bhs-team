namespace BhsTeam.Domain.Entities;

/// <summary>
/// Rotating refresh token. Only the hash is stored, so a database read cannot
/// be replayed against the API.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid MemberId { get; set; }
    public Member? Member { get; set; }

    public string TokenHash { get; set; } = "";
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }

    public bool IsActive => RevokedAt is null && DateTimeOffset.UtcNow < ExpiresAt;
}
