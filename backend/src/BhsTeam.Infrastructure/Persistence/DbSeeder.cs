using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Infrastructure.Persistence;

/// <summary>
/// Idempotent baseline data: the settings that replace the old hardcoded
/// constants, the three vacation types that replace VALID_TYPES, and the two
/// countries the holidays page groups by. Safe to run on every startup.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        await SeedSettingsAsync(db, ct);
        await SeedVacationTypesAsync(db, ct);
        await SeedCountriesAsync(db, ct);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedSettingsAsync(AppDbContext db, CancellationToken ct)
    {
        var existing = await db.AppSettings.Select(s => s.Key).ToListAsync(ct);

        foreach (var setting in SettingKeys.Defaults())
        {
            // Only insert missing keys — never overwrite a value an admin has changed.
            if (existing.Contains(setting.Key)) continue;
            db.AppSettings.Add(setting);
        }
    }

    private static async Task SeedVacationTypesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.VacationTypes.AnyAsync(ct)) return;

        // Codes V/C/S are what the history PNG export prints in each day cell.
        db.VacationTypes.AddRange(
            new VacationType
            {
                Id = Guid.NewGuid(), Name = "Vacation", Code = "V",
                ColorHex = "#8B5CF6", ColorDarkHex = "#6D28D9", DisplayOrder = 1, IsActive = true,
            },
            new VacationType
            {
                Id = Guid.NewGuid(), Name = "Compensation", Code = "C",
                ColorHex = "#06B6D4", ColorDarkHex = "#0E7490", DisplayOrder = 2, IsActive = true,
            },
            new VacationType
            {
                Id = Guid.NewGuid(), Name = "Special Leave", Code = "S",
                ColorHex = "#F97316", ColorDarkHex = "#C2410C", DisplayOrder = 3, IsActive = true,
            });
    }

    private static async Task SeedCountriesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Countries.AnyAsync(ct)) return;

        db.Countries.AddRange(
            new Country { Id = Guid.NewGuid(), Code = "VN", Name = "Vietnam", FlagEmoji = "🇻🇳" },
            new Country { Id = Guid.NewGuid(), Code = "AU", Name = "Australia", FlagEmoji = "🇦🇺" });
    }
}
