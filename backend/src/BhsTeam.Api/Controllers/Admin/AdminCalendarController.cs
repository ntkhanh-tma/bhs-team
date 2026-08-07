using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers.Admin;

/// <summary>
/// Holidays, releases and events — previously editable only by opening the
/// spreadsheet by hand.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = CurrentUser.AdminPolicy)]
public class AdminCalendarController(AdminCrudService crud, CalendarService calendar) : ControllerBase
{
    // ── Holidays ─────────────────────────────────────────────────────────────
    [HttpGet("holidays")]
    public Task<IReadOnlyList<HolidayDto>> ListHolidays(CancellationToken ct) =>
        calendar.GetHolidaysAsync(ct);

    [HttpPost("holidays")]
    public async Task<IActionResult> CreateHoliday(HolidayWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateHolidayAsync(r, ct));

    [HttpPut("holidays/{id:guid}")]
    public async Task<IActionResult> UpdateHoliday(Guid id, HolidayWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateHolidayAsync(id, r, ct));

    [HttpDelete("holidays/{id:guid}")]
    public async Task<IActionResult> DeleteHoliday(Guid id, CancellationToken ct)
    {
        await crud.DeleteHolidayAsync(id, ct);
        return NoContent();
    }

    /// <summary>Bulk create, for pasting a year of public holidays in one go.</summary>
    [HttpPost("holidays/bulk")]
    public async Task<IActionResult> BulkCreateHolidays(
        IReadOnlyList<HolidayWriteRequest> rows, CancellationToken ct)
    {
        var created = 0;
        var skipped = new List<string>();

        foreach (var row in rows)
        {
            try
            {
                await crud.CreateHolidayAsync(row, ct);
                created++;
            }
            catch (Application.Common.AppException ex)
            {
                skipped.Add($"{row.Date:yyyy-MM-dd} {row.Name}: {ex.Message}");
            }
        }

        return Ok(new { created, skipped });
    }

    // ── Release plans ────────────────────────────────────────────────────────
    [HttpGet("release-plans")]
    public Task<IReadOnlyList<ReleasePlanDto>> ListReleasePlans(CancellationToken ct) =>
        calendar.GetReleasePlansAsync(ct);

    [HttpPost("release-plans")]
    public async Task<IActionResult> CreateReleasePlan(ReleasePlanWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateReleasePlanAsync(r, ct));

    [HttpPut("release-plans/{id:guid}")]
    public async Task<IActionResult> UpdateReleasePlan(Guid id, ReleasePlanWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateReleasePlanAsync(id, r, ct));

    [HttpDelete("release-plans/{id:guid}")]
    public async Task<IActionResult> DeleteReleasePlan(Guid id, CancellationToken ct)
    {
        await crud.DeleteReleasePlanAsync(id, ct);
        return NoContent();
    }

    // ── Event plans ──────────────────────────────────────────────────────────
    [HttpGet("event-plans")]
    public Task<IReadOnlyList<EventPlanDto>> ListEventPlans(CancellationToken ct) =>
        calendar.GetEventPlansAsync(ct);

    [HttpPost("event-plans")]
    public async Task<IActionResult> CreateEventPlan(EventPlanWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateEventPlanAsync(r, ct));

    [HttpPut("event-plans/{id:guid}")]
    public async Task<IActionResult> UpdateEventPlan(Guid id, EventPlanWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateEventPlanAsync(id, r, ct));

    [HttpDelete("event-plans/{id:guid}")]
    public async Task<IActionResult> DeleteEventPlan(Guid id, CancellationToken ct)
    {
        await crud.DeleteEventPlanAsync(id, ct);
        return NoContent();
    }
}
