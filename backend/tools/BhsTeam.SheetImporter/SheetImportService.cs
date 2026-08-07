using System.Globalization;
using BhsTeam.Application.Common;
using BhsTeam.Domain;
using BhsTeam.Domain.Entities;
using BhsTeam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.SheetImporter;

/// <summary>
/// Idempotent import: every entity is upserted by its natural key, so the tool can
/// be re-run to pick up sheet edits made during the cutover window.
/// </summary>
public class SheetImportService(AppDbContext db, GatewayClient gateway)
{
    // Preserve today's behaviour as data rather than as hardcoded frontend arrays.
    private static readonly string[] NonSelectablePositions = ["manager", "team lead"];
    private static readonly string[] HiddenPositions = ["manager"];
    private static readonly string[] NonSelectableOrigins = ["tma"];

    public async Task RunAsync(string? promoteUsername, CancellationToken ct = default)
    {
        Console.WriteLine("Seeding baseline settings, vacation types and countries...");
        await DbSeeder.SeedAsync(db, ct);

        Console.WriteLine("Importing lookups (Database tab A/B/C)...");
        await ImportLookupsAsync(ct);

        Console.WriteLine("Importing members (Team-Info)...");
        var memberCount = await ImportMembersAsync(ct);
        Console.WriteLine($"  {memberCount} member(s).");

        Console.WriteLine("Importing vacations (Vacation-Plan)...");
        var vacationCount = await ImportVacationsAsync(ct);
        Console.WriteLine($"  {vacationCount} vacation day(s).");

        Console.WriteLine("Importing holidays / releases / events...");
        var (holidays, releases, events) = await ImportCalendarAsync(ct);
        Console.WriteLine($"  {holidays} holiday(s), {releases} release(s), {events} event(s).");

        if (!string.IsNullOrWhiteSpace(promoteUsername))
            await PromoteAsync(promoteUsername.Trim().ToLowerInvariant(), ct);

        Console.WriteLine("Import complete.");
    }

    private async Task ImportLookupsAsync(CancellationToken ct)
    {
        var lookups = await gateway.GetLookupsAsync();

        foreach (var (name, index) in Distinct(lookups.Teams).Select((n, i) => (n, i)))
        {
            if (await db.Teams.AnyAsync(t => t.Name == name, ct)) continue;
            db.Teams.Add(new Team { Id = Guid.NewGuid(), Name = name, DisplayOrder = index, IsActive = true });
        }

        foreach (var (name, index) in Distinct(lookups.Roles).Select((n, i) => (n, i)))
        {
            if (await db.Positions.AnyAsync(p => p.Name == name, ct)) continue;
            db.Positions.Add(new Position
            {
                Id = Guid.NewGuid(),
                Name = name,
                DisplayOrder = index,
                IsActive = true,
                IsSelectableInProfile = !NonSelectablePositions.Contains(name.ToLowerInvariant()),
                IsHiddenFromDirectory = HiddenPositions.Contains(name.ToLowerInvariant()),
            });
        }

        foreach (var (name, index) in Distinct(lookups.Dcs).Select((n, i) => (n, i)))
        {
            if (await db.Origins.AnyAsync(o => o.Name == name, ct)) continue;
            db.Origins.Add(new Origin
            {
                Id = Guid.NewGuid(),
                Name = name,
                DisplayOrder = index,
                IsActive = true,
                IsSelectableInProfile = !NonSelectableOrigins.Contains(name.ToLowerInvariant()),
            });
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task<int> ImportMembersAsync(CancellationToken ct)
    {
        var directory = await gateway.GetMembersAsync();
        var teams = await db.Teams.ToDictionaryAsync(t => t.Name.ToLowerInvariant(), t => t.Id, ct);
        var positions = await db.Positions.ToDictionaryAsync(p => p.Name.ToLowerInvariant(), p => p.Id, ct);
        var origins = await db.Origins.ToDictionaryAsync(o => o.Name.ToLowerInvariant(), o => o.Id, ct);

        var count = 0;
        foreach (var row in directory)
        {
            var username = row.Username?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(username)) continue;

            // The directory response withholds PII; fetch the full row per member.
            var profile = await gateway.GetProfileAsync(username) ?? row;
            var (birthDay, birthMonth) = Mapping.ParseBirthday(profile.Birthday);

            var member = await db.Members.FirstOrDefaultAsync(m => m.Username == username, ct);
            if (member is null)
            {
                member = new Member
                {
                    Id = Guid.NewGuid(),
                    Username = username,
                    AccessRole = AccessRole.Member,
                    MustSetPassword = true,   // no password survives the import
                    CreatedAt = DateTimeOffset.UtcNow,
                };
                db.Members.Add(member);
            }

            member.Name = Clean(profile.Name) ?? username;
            member.TeamId = Resolve(teams, profile.Department);
            member.PositionId = Resolve(positions, profile.Position);
            member.OriginId = Resolve(origins, profile.Dc);
            member.Ip = Clean(profile.Ip);
            member.PublicIp = Clean(profile.PublicIp);
            member.PcName = Clean(profile.PcName);
            member.MacAddress = Clean(profile.MacAddress);
            member.Email = Clean(profile.Email);
            member.Mobile = Clean(profile.Mobile);
            member.BirthDay = birthDay;
            member.BirthMonth = birthMonth;
            member.IsActive = true;
            member.UpdatedAt = DateTimeOffset.UtcNow;

            count++;
        }

        await db.SaveChangesAsync(ct);
        return count;
    }

    private async Task<int> ImportVacationsAsync(CancellationToken ct)
    {
        var rows = await gateway.GetVacationsAsync();
        var members = await db.Members.ToDictionaryAsync(m => m.Username, m => m.Id, ct);
        var types = await db.VacationTypes.ToDictionaryAsync(t => t.Name.ToLowerInvariant(), t => t.Id, ct);
        var fallbackType = types.TryGetValue("vacation", out var v) ? v : types.Values.First();

        // The gateway already filters out 'Deleted' rows, so everything here is active.
        var existing = await db.Vacations.IgnoreQueryFilters()
            .Select(x => new { x.MemberId, x.Date })
            .ToListAsync(ct);
        var existingKeys = existing.Select(x => (x.MemberId, x.Date)).ToHashSet();

        var count = 0;
        foreach (var row in rows)
        {
            var username = row.Username?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(username) || !members.TryGetValue(username, out var memberId))
                continue;

            if (!DateOnly.TryParseExact(row.Date?.Trim(), "yyyy-MM-dd",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                continue;

            if (!existingKeys.Add((memberId, date))) continue;

            var typeId = types.TryGetValue((row.Type ?? "").Trim().ToLowerInvariant(), out var t)
                ? t : fallbackType;

            db.Vacations.Add(new Vacation
            {
                Id = Guid.NewGuid(),
                MemberId = memberId,
                Date = date,
                VacationTypeId = typeId,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            count++;
        }

        await db.SaveChangesAsync(ct);
        return count;
    }

    private async Task<(int Holidays, int Releases, int Events)> ImportCalendarAsync(CancellationToken ct)
    {
        var countries = await db.Countries.ToListAsync(ct);

        var holidayCount = 0;
        foreach (var row in await gateway.GetHolidaysAsync())
        {
            if (!TryParseDate(row.Date, out var date)) continue;
            var name = Clean(row.Name);
            if (name is null) continue;

            var countryId = MatchCountry(countries, row.Country);
            if (await db.Holidays.AnyAsync(
                    h => h.Date == date && h.Name == name && h.CountryId == countryId, ct)) continue;

            db.Holidays.Add(new Holiday
            {
                Id = Guid.NewGuid(), Date = date, Name = name, CountryId = countryId,
            });
            holidayCount++;
        }

        var releaseCount = 0;
        foreach (var row in await gateway.GetReleasePlansAsync())
        {
            if (!TryParseDate(row.Date, out var date)) continue;
            var release = Clean(row.Release);
            if (release is null) continue;

            if (await db.ReleasePlans.AnyAsync(r => r.Date == date && r.Release == release, ct)) continue;

            db.ReleasePlans.Add(new ReleasePlan { Id = Guid.NewGuid(), Date = date, Release = release });
            releaseCount++;
        }

        var eventCount = 0;
        foreach (var row in await gateway.GetEventPlansAsync())
        {
            if (!TryParseDate(row.Date, out var date)) continue;
            var description = Clean(row.Description);
            if (description is null) continue;

            if (await db.EventPlans.AnyAsync(e => e.Date == date && e.Description == description, ct)) continue;

            db.EventPlans.Add(new EventPlan { Id = Guid.NewGuid(), Date = date, Description = description });
            eventCount++;
        }

        await db.SaveChangesAsync(ct);
        return (holidayCount, releaseCount, eventCount);
    }

    private async Task PromoteAsync(string username, CancellationToken ct)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Username == username, ct);
        if (member is null)
        {
            Console.Error.WriteLine($"WARNING: cannot promote '{username}' — no such member.");
            return;
        }

        member.AccessRole = AccessRole.Admin;
        member.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        Console.WriteLine(
            $"Promoted '{username}' to Admin. They have no password yet — sign in with any " +
            "password to trigger the first-login setup flow.");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private static IEnumerable<string> Distinct(IEnumerable<string>? values) =>
        (values ?? [])
        .Select(v => v?.Trim() ?? "")
        .Where(v => v.Length > 0)
        .GroupBy(v => v.ToLowerInvariant())
        .Select(g => g.First());

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static Guid? Resolve(Dictionary<string, Guid> lookup, string? name) =>
        !string.IsNullOrWhiteSpace(name) && lookup.TryGetValue(name.Trim().ToLowerInvariant(), out var id)
            ? id
            : null;

    private static Guid? MatchCountry(List<Country> countries, string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim().ToLowerInvariant();

        // The sheet used free text: "Vietnam", "VN", "viet nam", "Australia", "AU".
        var match = countries.FirstOrDefault(c =>
            c.Code.Equals(value, StringComparison.OrdinalIgnoreCase) ||
            c.Name.Equals(value, StringComparison.OrdinalIgnoreCase) ||
            value.Replace(" ", "").Contains(c.Name.Replace(" ", ""), StringComparison.OrdinalIgnoreCase) ||
            (c.Code == "VN" && value.Contains("viet")));

        return match?.Id;
    }

    private static bool TryParseDate(string? raw, out DateOnly date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(raw)) return false;

        string[] formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "M/d/yyyy", "yyyy/MM/dd"];
        return DateOnly.TryParseExact(raw.Trim(), formats,
                   CultureInfo.InvariantCulture, DateTimeStyles.None, out date)
               || DateOnly.TryParse(raw.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }
}
