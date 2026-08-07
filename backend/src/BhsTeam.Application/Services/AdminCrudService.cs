using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

/// <summary>
/// Admin-only writes across the lookup, calendar and member tables. Every change
/// is recorded through <see cref="IAuditLogger"/> because an Admin can edit other
/// people's PII.
/// </summary>
public class AdminCrudService(IAppDbContext db, IAuditLogger audit)
{
    // ── Teams ────────────────────────────────────────────────────────────────
    public Task<List<Team>> ListTeamsAsync(CancellationToken ct) =>
        db.Teams.AsNoTracking().OrderBy(t => t.DisplayOrder).ThenBy(t => t.Name).ToListAsync(ct);

    public async Task<Team> CreateTeamAsync(TeamWriteRequest r, CancellationToken ct)
    {
        await EnsureUniqueAsync(db.Teams, t => t.Name == r.Name.Trim(), "Team", r.Name, ct);
        var team = new Team
        {
            Id = Guid.NewGuid(), Name = r.Name.Trim(), ColorHex = r.ColorHex,
            DisplayOrder = r.DisplayOrder, IsActive = r.IsActive,
        };
        db.Teams.Add(team);
        await SaveAndAuditAsync("Team", team.Id, "Created", r, ct);
        return team;
    }

    public async Task<Team> UpdateTeamAsync(Guid id, TeamWriteRequest r, CancellationToken ct)
    {
        var team = await db.Teams.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw AppException.NotFound("Team");
        await EnsureUniqueAsync(db.Teams, t => t.Name == r.Name.Trim() && t.Id != id, "Team", r.Name, ct);

        team.Name = r.Name.Trim();
        team.ColorHex = r.ColorHex;
        team.DisplayOrder = r.DisplayOrder;
        team.IsActive = r.IsActive;

        await SaveAndAuditAsync("Team", id, "Updated", r, ct);
        return team;
    }

    public Task DeleteTeamAsync(Guid id, CancellationToken ct) => DeleteAsync(db.Teams, id, "Team", ct);

    // ── Positions ────────────────────────────────────────────────────────────
    public Task<List<Position>> ListPositionsAsync(CancellationToken ct) =>
        db.Positions.AsNoTracking().OrderBy(p => p.DisplayOrder).ThenBy(p => p.Name).ToListAsync(ct);

    public async Task<Position> CreatePositionAsync(PositionWriteRequest r, CancellationToken ct)
    {
        await EnsureUniqueAsync(db.Positions, p => p.Name == r.Name.Trim(), "Position", r.Name, ct);
        var position = new Position
        {
            Id = Guid.NewGuid(), Name = r.Name.Trim(), DisplayOrder = r.DisplayOrder,
            IsActive = r.IsActive, IsSelectableInProfile = r.IsSelectableInProfile,
            IsHiddenFromDirectory = r.IsHiddenFromDirectory,
        };
        db.Positions.Add(position);
        await SaveAndAuditAsync("Position", position.Id, "Created", r, ct);
        return position;
    }

    public async Task<Position> UpdatePositionAsync(Guid id, PositionWriteRequest r, CancellationToken ct)
    {
        var position = await db.Positions.FirstOrDefaultAsync(p => p.Id == id, ct)
                       ?? throw AppException.NotFound("Position");
        await EnsureUniqueAsync(db.Positions, p => p.Name == r.Name.Trim() && p.Id != id, "Position", r.Name, ct);

        position.Name = r.Name.Trim();
        position.DisplayOrder = r.DisplayOrder;
        position.IsActive = r.IsActive;
        position.IsSelectableInProfile = r.IsSelectableInProfile;
        position.IsHiddenFromDirectory = r.IsHiddenFromDirectory;

        await SaveAndAuditAsync("Position", id, "Updated", r, ct);
        return position;
    }

    public Task DeletePositionAsync(Guid id, CancellationToken ct) => DeleteAsync(db.Positions, id, "Position", ct);

    // ── Origins ──────────────────────────────────────────────────────────────
    public Task<List<Origin>> ListOriginsAsync(CancellationToken ct) =>
        db.Origins.AsNoTracking().OrderBy(o => o.DisplayOrder).ThenBy(o => o.Name).ToListAsync(ct);

    public async Task<Origin> CreateOriginAsync(OriginWriteRequest r, CancellationToken ct)
    {
        await EnsureUniqueAsync(db.Origins, o => o.Name == r.Name.Trim(), "Origin", r.Name, ct);
        var origin = new Origin
        {
            Id = Guid.NewGuid(), Name = r.Name.Trim(), DisplayOrder = r.DisplayOrder,
            IsActive = r.IsActive, IsSelectableInProfile = r.IsSelectableInProfile,
        };
        db.Origins.Add(origin);
        await SaveAndAuditAsync("Origin", origin.Id, "Created", r, ct);
        return origin;
    }

    public async Task<Origin> UpdateOriginAsync(Guid id, OriginWriteRequest r, CancellationToken ct)
    {
        var origin = await db.Origins.FirstOrDefaultAsync(o => o.Id == id, ct)
                     ?? throw AppException.NotFound("Origin");
        await EnsureUniqueAsync(db.Origins, o => o.Name == r.Name.Trim() && o.Id != id, "Origin", r.Name, ct);

        origin.Name = r.Name.Trim();
        origin.DisplayOrder = r.DisplayOrder;
        origin.IsActive = r.IsActive;
        origin.IsSelectableInProfile = r.IsSelectableInProfile;

        await SaveAndAuditAsync("Origin", id, "Updated", r, ct);
        return origin;
    }

    public Task DeleteOriginAsync(Guid id, CancellationToken ct) => DeleteAsync(db.Origins, id, "Origin", ct);

    // ── Vacation types ───────────────────────────────────────────────────────
    public Task<List<VacationType>> ListVacationTypesAsync(CancellationToken ct) =>
        db.VacationTypes.AsNoTracking().OrderBy(t => t.DisplayOrder).ToListAsync(ct);

    public async Task<VacationType> CreateVacationTypeAsync(VacationTypeWriteRequest r, CancellationToken ct)
    {
        await EnsureUniqueAsync(db.VacationTypes, t => t.Name == r.Name.Trim(), "Vacation type", r.Name, ct);
        var type = new VacationType
        {
            Id = Guid.NewGuid(), Name = r.Name.Trim(), Code = r.Code.Trim(),
            ColorHex = r.ColorHex, ColorDarkHex = r.ColorDarkHex,
            DisplayOrder = r.DisplayOrder, IsActive = r.IsActive,
        };
        db.VacationTypes.Add(type);
        await SaveAndAuditAsync("VacationType", type.Id, "Created", r, ct);
        return type;
    }

    public async Task<VacationType> UpdateVacationTypeAsync(Guid id, VacationTypeWriteRequest r, CancellationToken ct)
    {
        var type = await db.VacationTypes.FirstOrDefaultAsync(t => t.Id == id, ct)
                   ?? throw AppException.NotFound("Vacation type");
        await EnsureUniqueAsync(db.VacationTypes, t => t.Name == r.Name.Trim() && t.Id != id,
            "Vacation type", r.Name, ct);

        type.Name = r.Name.Trim();
        type.Code = r.Code.Trim();
        type.ColorHex = r.ColorHex;
        type.ColorDarkHex = r.ColorDarkHex;
        type.DisplayOrder = r.DisplayOrder;
        type.IsActive = r.IsActive;

        await SaveAndAuditAsync("VacationType", id, "Updated", r, ct);
        return type;
    }

    public async Task DeleteVacationTypeAsync(Guid id, CancellationToken ct)
    {
        if (await db.Vacations.IgnoreQueryFilters().AnyAsync(v => v.VacationTypeId == id, ct))
            throw AppException.Conflict(
                "That type is in use by existing entries. Deactivate it instead of deleting it.");

        await DeleteAsync(db.VacationTypes, id, "VacationType", ct);
    }

    // ── Countries ────────────────────────────────────────────────────────────
    public Task<List<Country>> ListCountriesAsync(CancellationToken ct) =>
        db.Countries.AsNoTracking().OrderBy(c => c.Name).ToListAsync(ct);

    public async Task<Country> CreateCountryAsync(CountryWriteRequest r, CancellationToken ct)
    {
        await EnsureUniqueAsync(db.Countries, c => c.Code == r.Code.Trim(), "Country", r.Code, ct);
        var country = new Country
        {
            Id = Guid.NewGuid(), Code = r.Code.Trim(), Name = r.Name.Trim(), FlagEmoji = r.FlagEmoji,
        };
        db.Countries.Add(country);
        await SaveAndAuditAsync("Country", country.Id, "Created", r, ct);
        return country;
    }

    public async Task<Country> UpdateCountryAsync(Guid id, CountryWriteRequest r, CancellationToken ct)
    {
        var country = await db.Countries.FirstOrDefaultAsync(c => c.Id == id, ct)
                      ?? throw AppException.NotFound("Country");
        await EnsureUniqueAsync(db.Countries, c => c.Code == r.Code.Trim() && c.Id != id, "Country", r.Code, ct);

        country.Code = r.Code.Trim();
        country.Name = r.Name.Trim();
        country.FlagEmoji = r.FlagEmoji;

        await SaveAndAuditAsync("Country", id, "Updated", r, ct);
        return country;
    }

    public Task DeleteCountryAsync(Guid id, CancellationToken ct) => DeleteAsync(db.Countries, id, "Country", ct);

    // ── Holidays ─────────────────────────────────────────────────────────────
    public async Task<Holiday> CreateHolidayAsync(HolidayWriteRequest r, CancellationToken ct)
    {
        var holiday = new Holiday
        {
            Id = Guid.NewGuid(), Date = r.Date, Name = r.Name.Trim(), CountryId = r.CountryId,
        };
        db.Holidays.Add(holiday);
        await SaveAndAuditAsync("Holiday", holiday.Id, "Created", r, ct);
        return holiday;
    }

    public async Task<Holiday> UpdateHolidayAsync(Guid id, HolidayWriteRequest r, CancellationToken ct)
    {
        var holiday = await db.Holidays.FirstOrDefaultAsync(h => h.Id == id, ct)
                      ?? throw AppException.NotFound("Holiday");

        holiday.Date = r.Date;
        holiday.Name = r.Name.Trim();
        holiday.CountryId = r.CountryId;

        await SaveAndAuditAsync("Holiday", id, "Updated", r, ct);
        return holiday;
    }

    public Task DeleteHolidayAsync(Guid id, CancellationToken ct) => DeleteAsync(db.Holidays, id, "Holiday", ct);

    // ── Release plans ────────────────────────────────────────────────────────
    public async Task<ReleasePlan> CreateReleasePlanAsync(ReleasePlanWriteRequest r, CancellationToken ct)
    {
        var plan = new ReleasePlan { Id = Guid.NewGuid(), Date = r.Date, Release = r.Release.Trim() };
        db.ReleasePlans.Add(plan);
        await SaveAndAuditAsync("ReleasePlan", plan.Id, "Created", r, ct);
        return plan;
    }

    public async Task<ReleasePlan> UpdateReleasePlanAsync(Guid id, ReleasePlanWriteRequest r, CancellationToken ct)
    {
        var plan = await db.ReleasePlans.FirstOrDefaultAsync(p => p.Id == id, ct)
                   ?? throw AppException.NotFound("Release plan");

        plan.Date = r.Date;
        plan.Release = r.Release.Trim();

        await SaveAndAuditAsync("ReleasePlan", id, "Updated", r, ct);
        return plan;
    }

    public Task DeleteReleasePlanAsync(Guid id, CancellationToken ct) =>
        DeleteAsync(db.ReleasePlans, id, "ReleasePlan", ct);

    // ── Event plans ──────────────────────────────────────────────────────────
    public async Task<EventPlan> CreateEventPlanAsync(EventPlanWriteRequest r, CancellationToken ct)
    {
        var plan = new EventPlan { Id = Guid.NewGuid(), Date = r.Date, Description = r.Description.Trim() };
        db.EventPlans.Add(plan);
        await SaveAndAuditAsync("EventPlan", plan.Id, "Created", r, ct);
        return plan;
    }

    public async Task<EventPlan> UpdateEventPlanAsync(Guid id, EventPlanWriteRequest r, CancellationToken ct)
    {
        var plan = await db.EventPlans.FirstOrDefaultAsync(p => p.Id == id, ct)
                   ?? throw AppException.NotFound("Event plan");

        plan.Date = r.Date;
        plan.Description = r.Description.Trim();

        await SaveAndAuditAsync("EventPlan", id, "Updated", r, ct);
        return plan;
    }

    public Task DeleteEventPlanAsync(Guid id, CancellationToken ct) =>
        DeleteAsync(db.EventPlans, id, "EventPlan", ct);

    // ── Members ──────────────────────────────────────────────────────────────
    public async Task<MemberDetailDto> CreateMemberAsync(MemberWriteRequest r, CancellationToken ct)
    {
        var username = r.Username.Trim().ToLowerInvariant();
        if (await db.Members.AnyAsync(m => m.Username == username, ct))
            throw AppException.Conflict($"Username '{username}' is already taken.");

        var (day, month) = Mapping.ParseBirthday(r.Birthday);
        var member = new Member
        {
            Id = Guid.NewGuid(),
            Username = username,
            Name = r.Name.Trim(),
            TeamId = r.TeamId, PositionId = r.PositionId, OriginId = r.OriginId,
            Ip = r.Ip, PublicIp = r.PublicIp, PcName = r.PcName, MacAddress = r.MacAddress,
            Email = r.Email, Mobile = r.Mobile, BirthDay = day, BirthMonth = month,
            IsActive = r.IsActive,
            AccessRole = AccessRole.Member,
            MustSetPassword = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Members.Add(member);

        await SaveAndAuditAsync("Member", member.Id, "Created", new { r.Username, r.Name }, ct);
        return await LoadDetailAsync(member.Id, ct);
    }

    public async Task<MemberDetailDto> UpdateMemberAsync(Guid id, MemberWriteRequest r, CancellationToken ct)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == id, ct)
                     ?? throw AppException.NotFound("Member");

        var username = r.Username.Trim().ToLowerInvariant();
        if (username != member.Username && await db.Members.AnyAsync(m => m.Username == username, ct))
            throw AppException.Conflict($"Username '{username}' is already taken.");

        var (day, month) = Mapping.ParseBirthday(r.Birthday);

        member.Username = username;
        member.Name = r.Name.Trim();
        member.TeamId = r.TeamId;
        member.PositionId = r.PositionId;
        member.OriginId = r.OriginId;
        member.Ip = r.Ip;
        member.PublicIp = r.PublicIp;
        member.PcName = r.PcName;
        member.MacAddress = r.MacAddress;
        member.Email = r.Email;
        member.Mobile = r.Mobile;
        member.BirthDay = day;
        member.BirthMonth = month;
        member.IsActive = r.IsActive;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        await SaveAndAuditAsync("Member", id, "Updated", new { r.Username, r.Name, r.IsActive }, ct);
        return await LoadDetailAsync(id, ct);
    }

    public async Task SetAccessRoleAsync(Guid id, string role, Guid? actingMemberId, CancellationToken ct)
    {
        if (!Enum.TryParse<AccessRole>(role, ignoreCase: true, out var parsed))
            throw new AppException($"'{role}' is not a valid access role.");

        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == id, ct)
                     ?? throw AppException.NotFound("Member");

        // Don't let the last admin demote themselves and lock everyone out.
        if (member.AccessRole == AccessRole.Admin && parsed != AccessRole.Admin)
        {
            var remaining = await db.Members
                .CountAsync(m => m.AccessRole == AccessRole.Admin && m.Id != id && m.IsActive, ct);
            if (remaining == 0)
                throw AppException.Conflict("You cannot remove the last remaining admin.");
        }

        member.AccessRole = parsed;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        await SaveAndAuditAsync("Member", id, "AccessRoleChanged", new { To = parsed.ToString() }, ct);
    }

    public async Task DeleteMemberAsync(Guid id, CancellationToken ct)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == id, ct)
                     ?? throw AppException.NotFound("Member");

        if (member.AccessRole == AccessRole.Admin &&
            await db.Members.CountAsync(m => m.AccessRole == AccessRole.Admin && m.IsActive, ct) <= 1)
            throw AppException.Conflict("You cannot delete the last remaining admin.");

        // Deactivate rather than delete: vacation history should survive.
        member.IsActive = false;
        member.UpdatedAt = DateTimeOffset.UtcNow;

        await SaveAndAuditAsync("Member", id, "Deactivated", null, ct);
    }

    // ── Vacations (admin view includes tombstones) ───────────────────────────
    public async Task<IReadOnlyList<AdminVacationDto>> ListVacationsAsync(
        bool includeDeleted, DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var query = db.Vacations.IgnoreQueryFilters()
            .Include(v => v.Member).Include(v => v.VacationType)
            .AsNoTracking().AsQueryable();

        if (!includeDeleted) query = query.Where(v => !v.IsDeleted);
        if (from is not null) query = query.Where(v => v.Date >= from);
        if (to is not null) query = query.Where(v => v.Date <= to);

        return await query.OrderByDescending(v => v.Date)
            .Select(v => new AdminVacationDto(
                v.Id, v.MemberId, v.Member!.Username, v.Member.Name, v.Date,
                v.VacationType!.Name, v.IsDeleted, v.DeletedAt))
            .ToListAsync(ct);
    }

    // ── Audit log ────────────────────────────────────────────────────────────
    public async Task<PagedResult<AuditLogDto>> ListAuditLogsAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var total = await db.AuditLogs.CountAsync(ct);
        var items = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(a => a.At)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.At,
                db.Members.Where(m => m.Id == a.ActorMemberId).Select(m => m.Username).FirstOrDefault(),
                a.Entity, a.EntityId, a.Action, a.ChangesJson))
            .ToListAsync(ct);

        return new PagedResult<AuditLogDto>(items, total, page, pageSize);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private async Task<MemberDetailDto> LoadDetailAsync(Guid id, CancellationToken ct)
    {
        var member = await db.Members
            .Include(m => m.Team).Include(m => m.Position).Include(m => m.Origin)
            .AsNoTracking().FirstAsync(m => m.Id == id, ct);
        return member.ToDetail();
    }

    private static async Task EnsureUniqueAsync<T>(
        DbSet<T> set, System.Linq.Expressions.Expression<Func<T, bool>> clash,
        string label, string value, CancellationToken ct) where T : class
    {
        if (await set.AnyAsync(clash, ct))
            throw AppException.Conflict($"{label} '{value}' already exists.");
    }

    private async Task DeleteAsync<T>(DbSet<T> set, Guid id, string label, CancellationToken ct)
        where T : class
    {
        var entity = await set.FindAsync([id], ct) ?? throw AppException.NotFound(label);
        set.Remove(entity);
        await SaveAndAuditAsync(label, id, "Deleted", null, ct);
    }

    private async Task SaveAndAuditAsync(
        string entity, Guid id, string action, object? changes, CancellationToken ct)
    {
        await audit.RecordAsync(entity, id.ToString(), action, changes, ct);
        await db.SaveChangesAsync(ct);
    }
}
