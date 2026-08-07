using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers;

[ApiController]
[Route("api/members")]
[Authorize]
public class MembersController(MemberService members, CurrentUser currentUser) : ControllerBase
{
    /// <summary>
    /// Team directory. Safe columns only — the PII that used to sit in the same
    /// payload is served exclusively by <see cref="Me"/> or the admin endpoints.
    /// </summary>
    [HttpGet]
    public Task<IReadOnlyList<MemberSummaryDto>> List(CancellationToken ct) =>
        members.ListDirectoryAsync(ct);

    [HttpGet("me")]
    public Task<MemberDetailDto> Me(CancellationToken ct) =>
        members.GetDetailAsync(currentUser.RequireMemberId(), ct);

    [HttpPut("me")]
    public Task<MemberDetailDto> UpdateMe(UpdateOwnProfileRequest request, CancellationToken ct) =>
        members.UpdateOwnProfileAsync(currentUser.RequireMemberId(), request, ct);
}
