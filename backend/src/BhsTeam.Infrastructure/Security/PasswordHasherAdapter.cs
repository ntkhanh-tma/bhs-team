using BhsTeam.Application.Common;
using BhsTeam.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace BhsTeam.Infrastructure.Security;

/// <summary>
/// Wraps ASP.NET Core Identity's PBKDF2 hasher. Only the hasher is borrowed —
/// the full Identity stack would impose its own schema for no benefit here.
/// </summary>
public class PasswordHasherAdapter : IPasswordHasher
{
    private readonly PasswordHasher<Member> _inner = new();
    private static readonly Member Dummy = new();

    public string Hash(string password) => _inner.HashPassword(Dummy, password);

    public bool Verify(string hash, string password)
    {
        var result = _inner.VerifyHashedPassword(Dummy, hash, password);
        return result is PasswordVerificationResult.Success
                      or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
