using BhsTeam.Application.Common;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

/// <summary>
/// The booking rules that used to live only in the browser
/// (register-vacation-dialog.component.ts) and were therefore advisory.
/// Every threshold comes from <see cref="ISettingsProvider"/>, so an admin can
/// change them without a redeploy.
/// </summary>
public class VacationPolicyService(IAppDbContext db, ISettingsProvider settings)
{
    public const string LockDayOfMonth = "booking.lockDayOfMonth";
    public const string ThrottleMinutes = "booking.throttleMinutes";
    public const string AllowWeekends = "booking.allowWeekends";
    public const string AllowPastDates = "booking.allowPastDates";
    public const string AllowHolidays = "booking.allowHolidays";
    public const string MaxMonthsAhead = "booking.maxMonthsAhead";
    public const string HolidayCountryCodes = "sidebar.holidayCountryCodes";

    /// <summary>
    /// Earliest month a member may book into. Before the lock day of month M the
    /// earliest is M+1; on or after it, M+2.
    /// </summary>
    public async Task<DateOnly> GetEarliestBookableMonthAsync(DateOnly today, CancellationToken ct = default)
    {
        var lockDay = await settings.GetIntAsync(LockDayOfMonth, 20, ct);
        var firstOfThisMonth = new DateOnly(today.Year, today.Month, 1);
        return firstOfThisMonth.AddMonths(today.Day >= lockDay ? 2 : 1);
    }

    public async Task EnforceThrottleAsync(Member member, CancellationToken ct = default)
    {
        var minutes = await settings.GetIntAsync(ThrottleMinutes, 5, ct);
        if (minutes <= 0 || member.LastVacationSubmissionAt is not { } last) return;

        var readyAt = last.AddMinutes(minutes);
        if (DateTimeOffset.UtcNow < readyAt)
        {
            var wait = (int)Math.Ceiling((readyAt - DateTimeOffset.UtcNow).TotalSeconds);
            throw AppException.TooManyRequests(
                $"Please wait {wait} more second(s) before submitting again.");
        }
    }

    /// <summary>Validates the dates being added. Removals are always allowed.</summary>
    public async Task ValidateAddDatesAsync(IReadOnlyList<DateOnly> addDates, CancellationToken ct = default)
    {
        if (addDates.Count == 0) return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var allowWeekends = await settings.GetBoolAsync(AllowWeekends, false, ct);
        var allowPast = await settings.GetBoolAsync(AllowPastDates, false, ct);
        var allowHolidays = await settings.GetBoolAsync(AllowHolidays, false, ct);
        var maxMonths = await settings.GetIntAsync(MaxMonthsAhead, 12, ct);
        var earliestMonth = await GetEarliestBookableMonthAsync(today, ct);
        var latest = new DateOnly(today.Year, today.Month, 1).AddMonths(maxMonths);

        foreach (var date in addDates)
        {
            if (!allowPast && date < today)
                throw AppException.Unprocessable($"{date:yyyy-MM-dd} is in the past.");

            if (!allowWeekends && date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                throw AppException.Unprocessable($"{date:yyyy-MM-dd} falls on a weekend.");

            if (date < earliestMonth)
                throw AppException.Unprocessable(
                    $"{date:yyyy-MM-dd} is inside the locked period. " +
                    $"The earliest bookable month is {earliestMonth:MMMM yyyy}.");

            if (date >= latest)
                throw AppException.Unprocessable(
                    $"{date:yyyy-MM-dd} is more than {maxMonths} month(s) ahead.");
        }

        if (!allowHolidays)
        {
            var codes = await settings.GetStringArrayAsync(HolidayCountryCodes, ct);
            var clash = await db.Holidays
                .Where(h => addDates.Contains(h.Date))
                .Where(h => codes.Count == 0 || (h.Country != null && codes.Contains(h.Country.Code)))
                .Select(h => new { h.Date, h.Name })
                .FirstOrDefaultAsync(ct);

            if (clash is not null)
                throw AppException.Unprocessable(
                    $"{clash.Date:yyyy-MM-dd} is a public holiday ({clash.Name}).");
        }
    }
}
