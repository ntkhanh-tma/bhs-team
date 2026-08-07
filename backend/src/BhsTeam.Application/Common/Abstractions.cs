using BhsTeam.Domain;

namespace BhsTeam.Application.Common;

/// <summary>Identity of the caller, resolved from the JWT by the API layer.</summary>
public interface ICurrentUser
{
    Guid? MemberId { get; }
    string? Username { get; }
    AccessRole? AccessRole { get; }
    bool IsAdmin { get; }
}

/// <summary>
/// Typed, cached access to <see cref="Domain.Entities.AppSetting"/>. Cache is
/// invalidated whenever an admin writes a setting, so changes take effect without
/// a redeploy.
/// </summary>
public interface ISettingsProvider
{
    Task<int> GetIntAsync(string key, int fallback, CancellationToken ct = default);
    Task<bool> GetBoolAsync(string key, bool fallback, CancellationToken ct = default);
    Task<string> GetStringAsync(string key, string fallback, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetStringArrayAsync(string key, CancellationToken ct = default);
    void Invalidate();
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string hash, string password);
}

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(Domain.Entities.Member member);

    /// <summary>Returns the raw token to hand to the client, and its hash to store.</summary>
    (string Raw, string Hash) CreateRefreshToken();

    string HashRefreshToken(string raw);

    /// <summary>Short-lived token that may only be used to set an initial password.</summary>
    (string Token, DateTimeOffset ExpiresAt) CreatePasswordSetupToken(Domain.Entities.Member member);

    Guid? ValidatePasswordSetupToken(string token);
}

public interface IAuditLogger
{
    Task RecordAsync(string entity, string entityId, string action, object? changes, CancellationToken ct = default);
}
