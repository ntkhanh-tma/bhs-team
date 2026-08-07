using System.Globalization;
using System.Text.Json;
using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

public class SettingsAdminService(
    IAppDbContext db,
    ISettingsProvider settings,
    ICurrentUser currentUser,
    IAuditLogger audit)
{
    public async Task<IReadOnlyList<AppSettingDto>> ListAsync(bool publicOnly, CancellationToken ct = default)
    {
        var query = db.AppSettings.AsNoTracking().AsQueryable();
        if (publicOnly) query = query.Where(s => s.IsPublic);

        return await query.OrderBy(s => s.Category).ThenBy(s => s.Key)
            .Select(s => new AppSettingDto(
                s.Key, s.Value, s.ValueType.ToString(), s.Category, s.Description, s.IsPublic))
            .ToListAsync(ct);
    }

    /// <summary>Bulk upsert. Each value is validated against its declared type.</summary>
    public async Task UpdateAsync(UpdateSettingsRequest request, CancellationToken ct = default)
    {
        var keys = request.Settings.Select(s => s.Key).ToList();
        var existing = await db.AppSettings.Where(s => keys.Contains(s.Key)).ToListAsync(ct);

        foreach (var incoming in request.Settings)
        {
            var setting = existing.FirstOrDefault(s => s.Key == incoming.Key)
                          ?? throw AppException.NotFound($"Setting '{incoming.Key}'");

            Validate(setting.Key, incoming.Value, setting.ValueType);

            if (setting.Value == incoming.Value) continue;

            await audit.RecordAsync("AppSetting", setting.Key, "Updated",
                new { From = setting.Value, To = incoming.Value }, ct);

            setting.Value = incoming.Value;
            setting.UpdatedAt = DateTimeOffset.UtcNow;
            setting.UpdatedByMemberId = currentUser.MemberId;
        }

        await db.SaveChangesAsync(ct);

        // Booking rules read through the cache, so it must drop immediately.
        settings.Invalidate();
    }

    private static void Validate(string key, string value, SettingValueType type)
    {
        switch (type)
        {
            case SettingValueType.Int:
                if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out _))
                    throw new AppException($"Setting '{key}' must be a whole number.");
                break;

            case SettingValueType.Bool:
                if (!bool.TryParse(value, out _))
                    throw new AppException($"Setting '{key}' must be true or false.");
                break;

            case SettingValueType.Json:
                try { JsonDocument.Parse(value).Dispose(); }
                catch (JsonException) { throw new AppException($"Setting '{key}' must be valid JSON."); }
                break;
        }
    }
}
