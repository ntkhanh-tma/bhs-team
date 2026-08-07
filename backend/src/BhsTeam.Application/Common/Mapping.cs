using System.Globalization;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain.Entities;

namespace BhsTeam.Application.Common;

public static class Mapping
{
    public static MemberSummaryDto ToSummary(this Member m) => new(
        m.Id, m.Username, m.Name,
        m.Team?.Name ?? "",
        m.Position?.Name ?? "");

    public static MemberDetailDto ToDetail(this Member m) => new(
        m.Id, m.Username, m.Name,
        m.Team?.Name ?? "",
        m.Position?.Name ?? "",
        m.Origin?.Name ?? "",
        m.Ip, m.PublicIp, m.PcName, m.MacAddress, m.Email, m.Mobile,
        FormatBirthday(m.BirthDay, m.BirthMonth),
        m.AccessRole.ToString(),
        m.IsActive);

    public static VacationDto ToDto(this Vacation v) => new(
        v.Id, v.MemberId,
        v.Member?.Username ?? "",
        v.Date,
        v.VacationType?.Name ?? "",
        v.VacationType?.Code ?? "");

    public static HolidayDto ToDto(this Holiday h) => new(
        h.Id, h.Date, h.Name, h.Country?.Code, h.Country?.Name, h.Country?.FlagEmoji);

    public static ReleasePlanDto ToDto(this ReleasePlan r) => new(r.Id, r.Date, r.Release);
    public static EventPlanDto ToDto(this EventPlan e) => new(e.Id, e.Date, e.Description);

    public static VacationTypeDto ToDto(this VacationType t) =>
        new(t.Id, t.Name, t.Code, t.ColorHex, t.ColorDarkHex, t.DisplayOrder);

    public static CountryDto ToDto(this Country c) => new(c.Id, c.Code, c.Name, c.FlagEmoji);

    /// <summary>The sheet stored birthdays as DD/MM with no year; keep that shape on the wire.</summary>
    public static string? FormatBirthday(int? day, int? month) =>
        day is > 0 && month is > 0
            ? $"{day.Value:D2}/{month.Value:D2}"
            : null;

    public static (int? Day, int? Month) ParseBirthday(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return (null, null);

        var parts = value.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2) return (null, null);

        if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var day) ||
            !int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var month))
            return (null, null);

        if (month is < 1 or > 12) return (null, null);
        if (day < 1 || day > DateTime.DaysInMonth(2024, month)) return (null, null); // 2024 = leap, allows 29/02

        return (day, month);
    }
}
