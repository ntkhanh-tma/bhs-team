using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = CurrentUser.AdminPolicy)]
public class AdminOperationsController(
    AdminCrudService crud,
    VacationService vacations,
    SettingsAdminService settings) : ControllerBase
{
    // ── Vacations (admins see tombstones and can act for any member) ─────────
    [HttpGet("vacations")]
    public Task<IReadOnlyList<AdminVacationDto>> ListVacations(
        [FromQuery] bool includeDeleted = true,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default) =>
        crud.ListVacationsAsync(includeDeleted, from, to, ct);

    /// <summary>Books leave on a member's behalf, bypassing the lock period and throttle.</summary>
    [HttpPost("vacations")]
    public Task<VacationBatchResult> CreateVacation(AdminVacationCreateRequest r, CancellationToken ct) =>
        vacations.SubmitAsync(
            r.MemberId,
            new VacationBatchRequest(r.VacationTypeId, [r.Date], []),
            bypassPolicy: true,
            ct);

    [HttpDelete("vacations/{id:guid}")]
    public async Task<IActionResult> DeleteVacation(Guid id, CancellationToken ct)
    {
        var vacation = (await crud.ListVacationsAsync(true, null, null, ct))
            .FirstOrDefault(v => v.Id == id)
            ?? throw Application.Common.AppException.NotFound("Vacation");

        await vacations.SubmitAsync(
            vacation.MemberId,
            new VacationBatchRequest(Guid.Empty, [], [vacation.Date]),
            bypassPolicy: true,
            ct);

        return NoContent();
    }

    /// <summary>Brings a soft-deleted day back, provided the slot is still free.</summary>
    [HttpPost("vacations/{id:guid}/restore")]
    public async Task<IActionResult> RestoreVacation(Guid id, CancellationToken ct)
    {
        await vacations.RestoreAsync(id, ct);
        return NoContent();
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    [HttpGet("settings")]
    public Task<IReadOnlyList<AppSettingDto>> ListSettings(CancellationToken ct) =>
        settings.ListAsync(publicOnly: false, ct);

    /// <summary>Bulk upsert. Takes effect immediately — the settings cache is dropped.</summary>
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(UpdateSettingsRequest r, CancellationToken ct)
    {
        await settings.UpdateAsync(r, ct);
        return NoContent();
    }

    // ── Audit log ────────────────────────────────────────────────────────────
    [HttpGet("audit-logs")]
    public Task<PagedResult<AuditLogDto>> ListAuditLogs(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        crud.ListAuditLogsAsync(page, pageSize, ct);
}
