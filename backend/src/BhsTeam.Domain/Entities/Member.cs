namespace BhsTeam.Domain.Entities;

/// <summary>
/// Replaces the Team-Info sheet (columns A-M). PII columns G-M are never
/// returned by the directory endpoint — only by the member's own profile
/// or to an Admin.
/// </summary>
public class Member
{
    public Guid Id { get; set; }

    /// <summary>Unique login key. Always stored lowercase (existing sheet convention).</summary>
    public string Username { get; set; } = "";

    /// <summary>Column E. Display name.</summary>
    public string Name { get; set; } = "";

    public Guid? TeamId { get; set; }       // column C "Team"
    public Guid? PositionId { get; set; }   // column D "Role" — job title
    public Guid? OriginId { get; set; }     // column B "Origin" / DC

    public Team? Team { get; set; }
    public Position? Position { get; set; }
    public Origin? Origin { get; set; }

    // ── PII (columns G-M) ────────────────────────────────────────────────
    public string? Ip { get; set; }
    public string? PublicIp { get; set; }
    public string? PcName { get; set; }
    public string? MacAddress { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }

    /// <summary>Column M is DD/MM with no year, so it is stored as two parts.</summary>
    public int? BirthDay { get; set; }
    public int? BirthMonth { get; set; }

    // ── Auth ─────────────────────────────────────────────────────────────
    public AccessRole AccessRole { get; set; } = AccessRole.Member;

    /// <summary>Null until the member completes the first-login password setup.</summary>
    public string? PasswordHash { get; set; }

    public bool MustSetPassword { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }

    /// <summary>Backs the server-side submit throttle (was localStorage-only).</summary>
    public DateTimeOffset? LastVacationSubmissionAt { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Vacation> Vacations { get; set; } = new List<Vacation>();
}
