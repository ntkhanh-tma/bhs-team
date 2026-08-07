namespace BhsTeam.Domain.Entities;

/// <summary>
/// One row per member per day. Replaces the Vacation-Plan sheet; the sheet's
/// Month column is dropped (derivable from <see cref="Date"/>) and its
/// 'Deleted' type sentinel becomes a real soft delete.
/// </summary>
public class Vacation
{
    public Guid Id { get; set; }

    public Guid MemberId { get; set; }
    public Member? Member { get; set; }

    public DateOnly Date { get; set; }

    public Guid VacationTypeId { get; set; }
    public VacationType? VacationType { get; set; }

    // A partial unique index on (MemberId, Date) WHERE IsDeleted = false keeps
    // the sheet's username|date dedup rule while still allowing a soft-deleted
    // day to be re-registered.
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedByMemberId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedByMemberId { get; set; }
}
