namespace BhsTeam.Application.Contracts;

// ── Lookup CRUD ──────────────────────────────────────────────────────────────
public record TeamWriteRequest(string Name, string? ColorHex, int DisplayOrder, bool IsActive);

public record PositionWriteRequest(
    string Name, int DisplayOrder, bool IsActive,
    bool IsSelectableInProfile, bool IsHiddenFromDirectory);

public record OriginWriteRequest(string Name, int DisplayOrder, bool IsActive, bool IsSelectableInProfile);

public record VacationTypeWriteRequest(
    string Name, string Code, string ColorHex, string ColorDarkHex, int DisplayOrder, bool IsActive);

public record CountryWriteRequest(string Code, string Name, string FlagEmoji);

// ── Calendar CRUD ────────────────────────────────────────────────────────────
public record HolidayWriteRequest(DateOnly Date, string Name, Guid? CountryId);
public record ReleasePlanWriteRequest(DateOnly Date, string Release);
public record EventPlanWriteRequest(DateOnly Date, string Description);

// ── Admin member management ──────────────────────────────────────────────────
public record MemberWriteRequest(
    string Username,
    string Name,
    Guid? TeamId,
    Guid? PositionId,
    Guid? OriginId,
    string? Ip,
    string? PublicIp,
    string? PcName,
    string? MacAddress,
    string? Email,
    string? Mobile,
    string? Birthday,
    bool IsActive);

public record SetAccessRoleRequest(string AccessRole);

// ── Admin vacation view (includes tombstones) ────────────────────────────────
public record AdminVacationDto(
    Guid Id,
    Guid MemberId,
    string Username,
    string MemberName,
    DateOnly Date,
    string Type,
    bool IsDeleted,
    DateTimeOffset? DeletedAt);

public record AdminVacationCreateRequest(Guid MemberId, DateOnly Date, Guid VacationTypeId);

// ── Audit log ────────────────────────────────────────────────────────────────
public record AuditLogDto(
    Guid Id, DateTimeOffset At, string? ActorUsername,
    string Entity, string EntityId, string Action, string ChangesJson);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
