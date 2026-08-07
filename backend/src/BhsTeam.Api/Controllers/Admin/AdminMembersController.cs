using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/members")]
[Authorize(Policy = CurrentUser.AdminPolicy)]
public class AdminMembersController(
    AdminCrudService crud,
    MemberService members,
    AuthService auth,
    CurrentUser currentUser) : ControllerBase
{
    /// <summary>Every member, including inactive ones and those hidden from the directory.</summary>
    [HttpGet]
    public Task<IReadOnlyList<MemberDetailDto>> List(CancellationToken ct) => members.ListAllAsync(ct);

    [HttpGet("{id:guid}")]
    public Task<MemberDetailDto> Get(Guid id, CancellationToken ct) => members.GetDetailAsync(id, ct);

    [HttpPost]
    public Task<MemberDetailDto> Create(MemberWriteRequest r, CancellationToken ct) =>
        crud.CreateMemberAsync(r, ct);

    [HttpPut("{id:guid}")]
    public Task<MemberDetailDto> Update(Guid id, MemberWriteRequest r, CancellationToken ct) =>
        crud.UpdateMemberAsync(id, r, ct);

    /// <summary>Grants or revokes Admin. Guarded so the last admin cannot be demoted.</summary>
    [HttpPut("{id:guid}/access-role")]
    public async Task<IActionResult> SetAccessRole(Guid id, SetAccessRoleRequest r, CancellationToken ct)
    {
        await crud.SetAccessRoleAsync(id, r.AccessRole, currentUser.MemberId, ct);
        return NoContent();
    }

    /// <summary>Clears the password and forces the member back through first-login setup.</summary>
    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, CancellationToken ct)
    {
        await auth.ResetPasswordAsync(id, ct);
        return NoContent();
    }

    /// <summary>Deactivates rather than deletes, so vacation history survives.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await crud.DeleteMemberAsync(id, ct);
        return NoContent();
    }
}
