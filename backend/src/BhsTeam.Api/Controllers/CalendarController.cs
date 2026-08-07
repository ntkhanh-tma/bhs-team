using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers;

[ApiController]
[Route("api")]
public class CalendarController(CalendarService calendar, SettingsAdminService settings)
    : ControllerBase
{
    /// <summary>Anonymous: the holidays page is public, and it contains no personal data.</summary>
    [HttpGet("holidays")]
    [AllowAnonymous]
    public Task<IReadOnlyList<HolidayDto>> Holidays(CancellationToken ct) =>
        calendar.GetHolidaysAsync(ct);

    [HttpGet("release-plans")]
    [Authorize]
    public Task<IReadOnlyList<ReleasePlanDto>> ReleasePlans(CancellationToken ct) =>
        calendar.GetReleasePlansAsync(ct);

    [HttpGet("event-plans")]
    [Authorize]
    public Task<IReadOnlyList<EventPlanDto>> EventPlans(CancellationToken ct) =>
        calendar.GetEventPlansAsync(ct);

    /// <summary>
    /// Profile dropdown vocabularies plus vacation types. Only rows flagged
    /// selectable are returned, replacing the frontend's EXCLUDED_ROLES/EXCLUDED_DCS.
    /// </summary>
    [HttpGet("lookups")]
    [Authorize]
    public Task<LookupsDto> Lookups(CancellationToken ct) => calendar.GetLookupsAsync(ct);

    /// <summary>
    /// Client-visible configuration. Anonymous so the SPA can bootstrap its rendering
    /// rules (colours, upcoming window, lock day) before anyone signs in.
    /// </summary>
    [HttpGet("settings/public")]
    [AllowAnonymous]
    public Task<IReadOnlyList<AppSettingDto>> PublicSettings(CancellationToken ct) =>
        settings.ListAsync(publicOnly: true, ct);
}
