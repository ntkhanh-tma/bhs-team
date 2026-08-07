using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

/// <summary>Replaces the holidays / releaseplans / eventplans / database actions.</summary>
public class CalendarService(IAppDbContext db)
{
    public async Task<IReadOnlyList<HolidayDto>> GetHolidaysAsync(CancellationToken ct = default)
    {
        var holidays = await db.Holidays.Include(h => h.Country).AsNoTracking()
            .OrderBy(h => h.Date).ToListAsync(ct);
        return holidays.Select(h => h.ToDto()).ToList();
    }

    public async Task<IReadOnlyList<ReleasePlanDto>> GetReleasePlansAsync(CancellationToken ct = default) =>
        await db.ReleasePlans.AsNoTracking().OrderBy(r => r.Date)
            .Select(r => new ReleasePlanDto(r.Id, r.Date, r.Release)).ToListAsync(ct);

    public async Task<IReadOnlyList<EventPlanDto>> GetEventPlansAsync(CancellationToken ct = default) =>
        await db.EventPlans.AsNoTracking().OrderBy(e => e.Date)
            .Select(e => new EventPlanDto(e.Id, e.Date, e.Description)).ToListAsync(ct);

    /// <summary>
    /// Profile dropdown vocabularies. Only selectable rows are returned, which is
    /// how EXCLUDED_ROLES / EXCLUDED_DCS become data instead of hardcoded arrays.
    /// </summary>
    public async Task<LookupsDto> GetLookupsAsync(CancellationToken ct = default)
    {
        var teams = await db.Teams.AsNoTracking().Where(t => t.IsActive)
            .OrderBy(t => t.DisplayOrder).ThenBy(t => t.Name)
            .Select(t => new LookupItemDto(t.Id, t.Name)).ToListAsync(ct);

        var positions = await db.Positions.AsNoTracking()
            .Where(p => p.IsActive && p.IsSelectableInProfile)
            .OrderBy(p => p.DisplayOrder).ThenBy(p => p.Name)
            .Select(p => new LookupItemDto(p.Id, p.Name)).ToListAsync(ct);

        var origins = await db.Origins.AsNoTracking()
            .Where(o => o.IsActive && o.IsSelectableInProfile)
            .OrderBy(o => o.DisplayOrder).ThenBy(o => o.Name)
            .Select(o => new LookupItemDto(o.Id, o.Name)).ToListAsync(ct);

        var types = await db.VacationTypes.AsNoTracking().Where(t => t.IsActive)
            .OrderBy(t => t.DisplayOrder)
            .Select(t => new VacationTypeDto(t.Id, t.Name, t.Code, t.ColorHex, t.ColorDarkHex, t.DisplayOrder))
            .ToListAsync(ct);

        var countries = await db.Countries.AsNoTracking().OrderBy(c => c.Name)
            .Select(c => new CountryDto(c.Id, c.Code, c.Name, c.FlagEmoji)).ToListAsync(ct);

        return new LookupsDto(teams, positions, origins, types, countries);
    }
}
