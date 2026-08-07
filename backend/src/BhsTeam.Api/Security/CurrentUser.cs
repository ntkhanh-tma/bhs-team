using System.Security.Claims;
using BhsTeam.Application.Common;
using BhsTeam.Domain;

namespace BhsTeam.Api.Security;

/// <summary>Resolves the caller from the validated JWT. Never trusts request bodies.</summary>
public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public const string AccessRoleClaim = "access_role";
    public const string AdminPolicy = "Admin";

    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? MemberId =>
        Guid.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string? Username => Principal?.FindFirstValue(ClaimTypes.Name);

    public AccessRole? AccessRole =>
        Enum.TryParse<AccessRole>(Principal?.FindFirstValue(AccessRoleClaim), out var role) ? role : null;

    public bool IsAdmin => AccessRole == Domain.AccessRole.Admin;

    /// <summary>Throws rather than returning null, for endpoints that require a caller.</summary>
    public Guid RequireMemberId() =>
        MemberId ?? throw AppException.Unauthorized("You must be signed in.");
}
