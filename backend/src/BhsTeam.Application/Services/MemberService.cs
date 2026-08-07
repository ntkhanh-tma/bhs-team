using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

public class MemberService(IAppDbContext db)
{
    private static IQueryable<Member> WithLookups(IQueryable<Member> q) =>
        q.Include(m => m.Team).Include(m => m.Position).Include(m => m.Origin);

    /// <summary>
    /// Directory list — safe columns only, exactly as the old `members` action.
    /// PII (IP, MAC, email, mobile, birthday) is never returned here.
    /// Positions flagged IsHiddenFromDirectory are omitted, which replaces the
    /// hardcoded `position !== 'manager'` filter in members.component.ts.
    /// </summary>
    public async Task<IReadOnlyList<MemberSummaryDto>> ListDirectoryAsync(CancellationToken ct = default) =>
        await WithLookups(db.Members.AsNoTracking())
            .Where(m => m.IsActive)
            .Where(m => m.Position == null || !m.Position.IsHiddenFromDirectory)
            .OrderBy(m => m.Name)
            .Select(m => new MemberSummaryDto(
                m.Id, m.Username, m.Name,
                m.Team!.Name ?? "",
                m.Position!.Name ?? ""))
            .ToListAsync(ct);

    /// <summary>Every member including hidden ones and PII. Admin only.</summary>
    public async Task<IReadOnlyList<MemberDetailDto>> ListAllAsync(CancellationToken ct = default)
    {
        var members = await WithLookups(db.Members.AsNoTracking())
            .OrderBy(m => m.Name).ToListAsync(ct);
        return members.Select(m => m.ToDetail()).ToList();
    }

    public async Task<MemberDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default)
    {
        var member = await WithLookups(db.Members.AsNoTracking())
            .FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw AppException.NotFound("Member");
        return member.ToDetail();
    }

    public async Task<Member?> FindByUsernameAsync(string username, CancellationToken ct = default) =>
        await WithLookups(db.Members)
            .FirstOrDefaultAsync(m => m.Username == username.Trim().ToLowerInvariant(), ct);

    /// <summary>
    /// Self-service profile edit. Null fields are left unchanged; empty strings clear
    /// a value, matching the old updateProfile semantics. Name and Id stay read-only.
    /// </summary>
    public async Task<MemberDetailDto> UpdateOwnProfileAsync(
        Guid memberId, UpdateOwnProfileRequest request, CancellationToken ct = default)
    {
        var member = await WithLookups(db.Members).FirstOrDefaultAsync(m => m.Id == memberId, ct)
                     ?? throw AppException.NotFound("Member");

        if (request.Username is { } rawUsername)
        {
            var username = rawUsername.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(username))
                throw new AppException("Username cannot be empty.");

            if (username != member.Username &&
                await db.Members.AnyAsync(m => m.Username == username && m.Id != memberId, ct))
                throw AppException.Conflict($"Username '{username}' is already taken.");

            member.Username = username;
        }

        member.TeamId = await ResolveLookupAsync(request.Department, db.Teams, member.TeamId, ct);
        member.PositionId = await ResolveSelectablePositionAsync(request.Position, member.PositionId, ct);
        member.OriginId = await ResolveSelectableOriginAsync(request.Dc, member.OriginId, ct);

        if (request.Ip is not null) member.Ip = Blank(request.Ip);
        if (request.PublicIp is not null) member.PublicIp = Blank(request.PublicIp);
        if (request.PcName is not null) member.PcName = Blank(request.PcName);
        if (request.MacAddress is not null) member.MacAddress = Blank(request.MacAddress);
        if (request.Email is not null) member.Email = Blank(request.Email);
        if (request.Mobile is not null) member.Mobile = Blank(request.Mobile);

        if (request.Birthday is not null)
        {
            var (day, month) = Mapping.ParseBirthday(request.Birthday);
            if (!string.IsNullOrWhiteSpace(request.Birthday) && day is null)
                throw new AppException("Birthday must be in DD/MM format.");
            member.BirthDay = day;
            member.BirthMonth = month;
        }

        member.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return await GetDetailAsync(memberId, ct);
    }

    private static string? Blank(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<Guid?> ResolveLookupAsync<T>(
        string? name, DbSet<T> set, Guid? current, CancellationToken ct) where T : class
    {
        if (name is null) return current;
        if (string.IsNullOrWhiteSpace(name)) return null;

        // Only Team reaches here; Position/Origin have their own selectability checks.
        var teams = set as DbSet<Team>;
        if (teams is null) return current;

        var match = await teams.FirstOrDefaultAsync(t => t.Name == name.Trim() && t.IsActive, ct)
                    ?? throw AppException.NotFound($"Team '{name}'");
        return match.Id;
    }

    private async Task<Guid?> ResolveSelectablePositionAsync(string? name, Guid? current, CancellationToken ct)
    {
        if (name is null) return current;
        if (string.IsNullOrWhiteSpace(name)) return null;

        var match = await db.Positions
            .FirstOrDefaultAsync(p => p.Name == name.Trim() && p.IsActive, ct)
            ?? throw AppException.NotFound($"Position '{name}'");

        // Replaces EXCLUDED_ROLES: members may not assign themselves a restricted title.
        if (!match.IsSelectableInProfile)
            throw AppException.Forbidden($"'{match.Name}' cannot be selected.");

        return match.Id;
    }

    private async Task<Guid?> ResolveSelectableOriginAsync(string? name, Guid? current, CancellationToken ct)
    {
        if (name is null) return current;
        if (string.IsNullOrWhiteSpace(name)) return null;

        var match = await db.Origins
            .FirstOrDefaultAsync(o => o.Name == name.Trim() && o.IsActive, ct)
            ?? throw AppException.NotFound($"Origin '{name}'");

        if (!match.IsSelectableInProfile)
            throw AppException.Forbidden($"'{match.Name}' cannot be selected.");

        return match.Id;
    }
}
