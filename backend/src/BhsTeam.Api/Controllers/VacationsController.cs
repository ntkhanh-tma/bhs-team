using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers;

[ApiController]
[Route("api/vacations")]
[Authorize]
public class VacationsController(
    VacationService vacations,
    VacationPolicyService policy,
    CurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<VacationDto>> List(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct) =>
        vacations.ListAsync(from, to, ct);

    /// <summary>
    /// Add and remove days in one call, mirroring the register dialog's diffing UX.
    /// The lock period, throttle, weekend/past/holiday rules are enforced here —
    /// they used to exist only in the browser.
    /// </summary>
    [HttpPost("batch")]
    public Task<VacationBatchResult> Submit(VacationBatchRequest request, CancellationToken ct) =>
        vacations.SubmitAsync(currentUser.RequireMemberId(), request, bypassPolicy: false, ct);

    /// <summary>Lets the client grey out locked days without hardcoding the rule.</summary>
    [HttpGet("earliest-bookable-month")]
    public async Task<object> EarliestBookableMonth(CancellationToken ct)
    {
        var month = await policy.GetEarliestBookableMonthAsync(
            DateOnly.FromDateTime(DateTime.UtcNow), ct);
        return new { earliestBookableMonth = month.ToString("yyyy-MM-dd") };
    }
}
