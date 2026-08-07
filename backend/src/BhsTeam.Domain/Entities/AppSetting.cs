namespace BhsTeam.Domain.Entities;

/// <summary>
/// The admin-editable "configurations". Every row here replaces a constant that
/// used to be hardcoded in the Angular bundle or in Code.gs.
/// </summary>
public class AppSetting
{
    /// <summary>Primary key, e.g. "booking.lockDayOfMonth".</summary>
    public string Key { get; set; } = "";

    public string Value { get; set; } = "";
    public SettingValueType ValueType { get; set; }

    /// <summary>Groups the settings screen in the admin UI.</summary>
    public string Category { get; set; } = "";

    public string? Description { get; set; }

    /// <summary>Exposed anonymously via GET /api/settings/public.</summary>
    public bool IsPublic { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedByMemberId { get; set; }
}
