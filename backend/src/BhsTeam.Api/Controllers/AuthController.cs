using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BhsTeam.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService auth, MemberService members, CurrentUser currentUser)
    : ControllerBase
{
    /// <summary>
    /// Returns either a normal session, or — for members imported from the sheet who
    /// have never set a password — a short-lived setup token and mustSetPassword=true.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public Task<LoginResponse> Login(LoginRequest request, CancellationToken ct) =>
        auth.LoginAsync(request, ct);

    [HttpPost("refresh")]
    [AllowAnonymous]
    public Task<LoginResponse> Refresh(RefreshRequest request, CancellationToken ct) =>
        auth.RefreshAsync(request, ct);

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [HttpPost("set-initial-password")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public Task<LoginResponse> SetInitialPassword(SetInitialPasswordRequest request, CancellationToken ct) =>
        auth.SetInitialPasswordAsync(request, ct);

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(currentUser.RequireMemberId(), request, ct);
        return NoContent();
    }

    /// <summary>The signed-in member, including their own PII.</summary>
    [HttpGet("me")]
    [Authorize]
    public Task<MemberDetailDto> Me(CancellationToken ct) =>
        members.GetDetailAsync(currentUser.RequireMemberId(), ct);
}
