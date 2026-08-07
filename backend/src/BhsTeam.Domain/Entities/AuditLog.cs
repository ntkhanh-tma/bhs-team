namespace BhsTeam.Domain.Entities;

/// <summary>Admins can edit other people's PII, so every admin write is recorded.</summary>
public class AuditLog
{
    public Guid Id { get; set; }
    public DateTimeOffset At { get; set; }
    public Guid? ActorMemberId { get; set; }
    public string Entity { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string Action { get; set; } = "";   // Created / Updated / Deleted / Restored
    public string ChangesJson { get; set; } = "{}";
}
