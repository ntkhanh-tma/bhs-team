using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BhsTeam.Application.Common;
using BhsTeam.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace BhsTeam.Infrastructure.Security;

public class TokenService(IOptions<JwtOptions> options) : ITokenService
{
    /// <summary>Deliberately not "role" — the sheet already uses that word for job title.</summary>
    public const string AccessRoleClaim = "access_role";

    private const string PurposeClaim = "purpose";
    private const string PasswordSetupPurpose = "password_setup";

    private readonly JwtOptions _options = options.Value;

    private SigningCredentials Credentials => new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
        SecurityAlgorithms.HmacSha256);

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(Member member)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = Credentials,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, member.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, member.Id.ToString()),
                new Claim(ClaimTypes.Name, member.Username),
                new Claim(AccessRoleClaim, member.AccessRole.ToString()),
            ]),
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }

    public (string Token, DateTimeOffset ExpiresAt) CreatePasswordSetupToken(Member member)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.PasswordSetupTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = Credentials,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, member.Id.ToString()),
                // Single-purpose: this token cannot be used as an access token because
                // the JwtBearer handler ignores it and only /auth/set-initial-password
                // checks for this claim.
                new Claim(PurposeClaim, PasswordSetupPurpose),
            ]),
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }

    public Guid? ValidatePasswordSetupToken(string token)
    {
        var parameters = new TokenValidationParameters
        {
            ValidIssuer = _options.Issuer,
            ValidAudience = _options.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        var result = new JsonWebTokenHandler().ValidateTokenAsync(token, parameters)
            .GetAwaiter().GetResult();

        if (!result.IsValid) return null;
        if (!result.Claims.TryGetValue(PurposeClaim, out var purpose) ||
            purpose as string != PasswordSetupPurpose) return null;

        return result.Claims.TryGetValue(JwtRegisteredClaimNames.Sub, out var sub) &&
               Guid.TryParse(sub as string, out var id)
            ? id
            : null;
    }

    public (string Raw, string Hash) CreateRefreshToken()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        return (raw, HashRefreshToken(raw));
    }

    /// <summary>
    /// Only the hash is persisted, so a database leak cannot be replayed. SHA-256 is
    /// sufficient here: the token is 384 bits of entropy, not a guessable secret.
    /// </summary>
    public string HashRefreshToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
