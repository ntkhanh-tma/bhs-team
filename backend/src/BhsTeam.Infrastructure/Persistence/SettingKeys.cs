using BhsTeam.Domain;
using BhsTeam.Domain.Entities;

namespace BhsTeam.Infrastructure.Persistence;

/// <summary>
/// Every key here replaces a constant that used to be hardcoded in the Angular
/// bundle or in Code.gs. Changing one takes effect without a redeploy.
/// </summary>
public static class SettingKeys
{
    public const string LockDayOfMonth = "booking.lockDayOfMonth";
    public const string ThrottleMinutes = "booking.throttleMinutes";
    public const string AllowWeekends = "booking.allowWeekends";
    public const string AllowPastDates = "booking.allowPastDates";
    public const string AllowHolidays = "booking.allowHolidays";
    public const string MaxMonthsAhead = "booking.maxMonthsAhead";
    public const string UpcomingWindowDays = "sidebar.upcomingWindowDays";
    public const string HolidayCountryCodes = "sidebar.holidayCountryCodes";
    public const string AvatarColors = "ui.avatarColors";
    public const string AvatarEmojis = "ui.avatarEmojis";
    public const string TeamColors = "ui.teamColors";

    public static IReadOnlyList<AppSetting> Defaults() =>
    [
        S(LockDayOfMonth, "20", SettingValueType.Int, "booking",
            "Day of month after which the next month closes for booking. Before this day the earliest bookable month is M+1; on or after it, M+2."),
        S(ThrottleMinutes, "5", SettingValueType.Int, "booking",
            "Minimum minutes between two vacation submissions by the same member."),
        S(AllowWeekends, "false", SettingValueType.Bool, "booking", "Allow registering leave on Saturdays and Sundays."),
        S(AllowPastDates, "false", SettingValueType.Bool, "booking", "Allow registering leave on dates in the past."),
        S(AllowHolidays, "false", SettingValueType.Bool, "booking", "Allow registering leave on a public holiday."),
        S(MaxMonthsAhead, "12", SettingValueType.Int, "booking", "How far into the future leave may be registered."),

        S(UpcomingWindowDays, "30", SettingValueType.Int, "sidebar",
            "How many days ahead the sidebar 'Upcoming' feed looks."),
        S(HolidayCountryCodes, """["VN"]""", SettingValueType.Json, "sidebar",
            "Country codes whose holidays appear in the sidebar and block booking."),

        S(AvatarColors, """["#6366F1","#8B5CF6","#EC4899","#F43F5E","#F97316","#F59E0B","#10B981","#14B8A6","#06B6D4","#3B82F6","#A855F7","#EF4444"]""",
            SettingValueType.Json, "ui", "Palette used for the deterministic member avatars."),
        S(AvatarEmojis, """["🦊","🐼","🐨","🐯","🦁","🐷","🐸","🐵","🦉","🦋","🐝","🐢","🐳","🐬","🦄","🐰","🐹","🐻","🐺","🦌","🦅","🐧","🦆","🦜","🐟","🦀","🐙","🦎","🦇","🦥"]""",
            SettingValueType.Json, "ui", "Emoji set used for the deterministic member avatars."),
        S(TeamColors, """[{"bg":"#EEF2FF","border":"#C7D2FE","text":"#4338CA"},{"bg":"#F5F3FF","border":"#DDD6FE","text":"#6D28D9"},{"bg":"#FDF2F8","border":"#FBCFE8","text":"#BE185D"},{"bg":"#FFF1F2","border":"#FECDD3","text":"#BE123C"},{"bg":"#FFF7ED","border":"#FED7AA","text":"#C2410C"},{"bg":"#FFFBEB","border":"#FDE68A","text":"#B45309"},{"bg":"#ECFDF5","border":"#A7F3D0","text":"#047857"},{"bg":"#F0FDFA","border":"#99F6E4","text":"#0F766E"},{"bg":"#ECFEFF","border":"#A5F3FC","text":"#0E7490"},{"bg":"#EFF6FF","border":"#BFDBFE","text":"#1D4ED8"}]""",
            SettingValueType.Json, "ui", "Palettes assigned to teams on the members and home pages."),
    ];

    private static AppSetting S(string key, string value, SettingValueType type, string category, string description) =>
        new()
        {
            Key = key,
            Value = value,
            ValueType = type,
            Category = category,
            Description = description,
            IsPublic = true,          // all of these drive client rendering
            UpdatedAt = DateTimeOffset.UtcNow,
        };
}
