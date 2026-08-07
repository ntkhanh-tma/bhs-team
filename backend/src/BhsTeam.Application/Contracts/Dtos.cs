namespace BhsTeam.Application.Contracts;

// ── Directory (safe columns only — mirrors the old `members` action) ──────────
public record MemberSummaryDto(
    Guid Id,
    string Username,
    string Name,
    string Department,   // Team name — kept as "department" to match the Angular Member model
    string Position);    // job title

// ── Full record: own profile, or any member when the caller is an Admin ───────
public record MemberDetailDto(
    Guid Id,
    string Username,
    string Name,
    string Department,
    string Position,
    string Dc,
    string? Ip,
    string? PublicIp,
    string? PcName,
    string? MacAddress,
    string? Email,
    string? Mobile,
    string? Birthday,          // rendered back as "DD/MM" for the existing UI
    string AccessRole,
    bool IsActive);

/// <summary>Self-service profile edit. Null means "leave unchanged".</summary>
public record UpdateOwnProfileRequest(
    string? Department,
    string? Position,
    string? Dc,
    string? Ip,
    string? PublicIp,
    string? PcName,
    string? MacAddress,
    string? Email,
    string? Mobile,
    string? Birthday,
    string? Username);

// ── Vacations ────────────────────────────────────────────────────────────────
public record VacationDto(
    Guid Id,
    Guid MemberId,
    string Username,
    DateOnly Date,
    string Type,
    string TypeCode);

/// <summary>
/// Keeps the shape of the old batch write so the register dialog's add/remove
/// diffing UX carries over unchanged.
/// </summary>
public record VacationBatchRequest(
    Guid VacationTypeId,
    IReadOnlyList<DateOnly> AddDates,
    IReadOnlyList<DateOnly> RemoveDates);

public record VacationBatchResult(int Added, int Removed, IReadOnlyList<string> Skipped);

// ── Calendar entries ─────────────────────────────────────────────────────────
public record HolidayDto(Guid Id, DateOnly Date, string Name, string? CountryCode, string? Country, string? FlagEmoji);
public record ReleasePlanDto(Guid Id, DateOnly Date, string Release);
public record EventPlanDto(Guid Id, DateOnly Date, string Description);

// ── Lookups (replaces the `database` action) ─────────────────────────────────
public record LookupItemDto(Guid Id, string Name);
public record VacationTypeDto(Guid Id, string Name, string Code, string ColorHex, string ColorDarkHex, int DisplayOrder);

public record LookupsDto(
    IReadOnlyList<LookupItemDto> Teams,
    IReadOnlyList<LookupItemDto> Positions,
    IReadOnlyList<LookupItemDto> Origins,
    IReadOnlyList<VacationTypeDto> VacationTypes,
    IReadOnlyList<CountryDto> Countries);

public record CountryDto(Guid Id, string Code, string Name, string FlagEmoji);

// ── Auth ─────────────────────────────────────────────────────────────────────
public record LoginRequest(string Username, string Password);

public record LoginResponse(
    string? AccessToken,
    DateTimeOffset? ExpiresAt,
    string? RefreshToken,
    bool MustSetPassword,
    string? PasswordSetupToken,
    MemberDetailDto? User);

public record RefreshRequest(string RefreshToken);
public record SetInitialPasswordRequest(string PasswordSetupToken, string NewPassword);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ── Settings ─────────────────────────────────────────────────────────────────
public record AppSettingDto(string Key, string Value, string ValueType, string Category, string? Description, bool IsPublic);
public record UpdateSettingsRequest(IReadOnlyList<AppSettingValueDto> Settings);
public record AppSettingValueDto(string Key, string Value);
