using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

public class AuthService(
    IAppDbContext db,
    MemberService members,
    IPasswordHasher hasher,
    ITokenService tokens)
{
    private static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(14);

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var member = await members.FindByUsernameAsync(request.Username, ct);

        // Members imported from the sheet have no password yet. Route them to the
        // one-time setup flow instead of failing the login outright.
        if (member is { IsActive: true, PasswordHash: null })
            return SetupRequired(member);

        if (member is null || !member.IsActive || member.PasswordHash is null ||
            !hasher.Verify(member.PasswordHash, request.Password))
            throw AppException.Unauthorized();

        if (member.MustSetPassword) return SetupRequired(member);

        member.LastLoginAt = DateTimeOffset.UtcNow;
        return await IssueAsync(member, ct);
    }

    public async Task<LoginResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens
            .Include(t => t.Member).ThenInclude(m => m!.Team)
            .Include(t => t.Member).ThenInclude(m => m!.Position)
            .Include(t => t.Member).ThenInclude(m => m!.Origin)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null || !stored.IsActive || stored.Member is null || !stored.Member.IsActive)
            throw AppException.Unauthorized("That session has expired. Please sign in again.");

        // Rotate: the presented token is burned before a new one is issued.
        stored.RevokedAt = DateTimeOffset.UtcNow;
        return await IssueAsync(stored.Member, ct, stored);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = tokens.HashRefreshToken(refreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null || !stored.IsActive) return;

        stored.RevokedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<LoginResponse> SetInitialPasswordAsync(
        SetInitialPasswordRequest request, CancellationToken ct = default)
    {
        var memberId = tokens.ValidatePasswordSetupToken(request.PasswordSetupToken)
                       ?? throw AppException.Unauthorized("That setup link is invalid or has expired.");

        var member = await db.Members
            .Include(m => m.Team).Include(m => m.Position).Include(m => m.Origin)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct)
            ?? throw AppException.NotFound("Member");

        RequireStrongPassword(request.NewPassword);

        member.PasswordHash = hasher.Hash(request.NewPassword);
        member.MustSetPassword = false;
        member.LastLoginAt = DateTimeOffset.UtcNow;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        return await IssueAsync(member, ct);
    }

    public async Task ChangePasswordAsync(
        Guid memberId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == memberId, ct)
                     ?? throw AppException.NotFound("Member");

        if (member.PasswordHash is null || !hasher.Verify(member.PasswordHash, request.CurrentPassword))
            throw AppException.Unauthorized("Your current password is incorrect.");

        RequireStrongPassword(request.NewPassword);

        member.PasswordHash = hasher.Hash(request.NewPassword);
        member.MustSetPassword = false;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        // Changing a password invalidates every other session.
        await RevokeAllAsync(memberId, ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Admin-triggered reset: clears the password and forces the setup flow.</summary>
    public async Task ResetPasswordAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == memberId, ct)
                     ?? throw AppException.NotFound("Member");

        member.PasswordHash = null;
        member.MustSetPassword = true;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        await RevokeAllAsync(memberId, ct);
        await db.SaveChangesAsync(ct);
    }

    private async Task RevokeAllAsync(Guid memberId, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.MemberId == memberId && t.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var token in active) token.RevokedAt = DateTimeOffset.UtcNow;
    }

    private LoginResponse SetupRequired(Member member)
    {
        var (token, _) = tokens.CreatePasswordSetupToken(member);
        return new LoginResponse(null, null, null, true, token, null);
    }

    private async Task<LoginResponse> IssueAsync(
        Member member, CancellationToken ct, RefreshToken? replacing = null)
    {
        var (accessToken, expiresAt) = tokens.CreateAccessToken(member);
        var (rawRefresh, refreshHash) = tokens.CreateRefreshToken();

        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            MemberId = member.Id,
            TokenHash = refreshHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.Add(RefreshLifetime),
        };
        db.RefreshTokens.Add(stored);

        if (replacing is not null) replacing.ReplacedByTokenId = stored.Id;

        await db.SaveChangesAsync(ct);

        return new LoginResponse(
            accessToken, expiresAt, rawRefresh,
            MustSetPassword: false, PasswordSetupToken: null,
            User: member.ToDetail());
    }

    private static void RequireStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 10)
            throw new AppException("Password must be at least 10 characters long.");
    }
}
