using System.Globalization;
using System.Text.Json;
using BhsTeam.Application.Common;
using BhsTeam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BhsTeam.Infrastructure.Services;

/// <summary>
/// Cached settings lookup. The cache is what makes reading a setting on every
/// booking request cheap; <see cref="Invalidate"/> is called whenever an admin
/// saves, so changes are visible immediately without a redeploy.
/// </summary>
public class SettingsProvider(AppDbContext db, IMemoryCache cache) : ISettingsProvider
{
    private const string CacheKey = "app-settings";
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    private async Task<Dictionary<string, string>> GetAllAsync(CancellationToken ct)
    {
        if (cache.TryGetValue(CacheKey, out Dictionary<string, string>? cached) && cached is not null)
            return cached;

        var settings = await db.AppSettings.AsNoTracking()
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        cache.Set(CacheKey, settings, Ttl);
        return settings;
    }

    public async Task<int> GetIntAsync(string key, int fallback, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        return all.TryGetValue(key, out var raw) &&
               int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : fallback;
    }

    public async Task<bool> GetBoolAsync(string key, bool fallback, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        return all.TryGetValue(key, out var raw) && bool.TryParse(raw, out var value) ? value : fallback;
    }

    public async Task<string> GetStringAsync(string key, string fallback, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        return all.TryGetValue(key, out var raw) ? raw : fallback;
    }

    public async Task<IReadOnlyList<string>> GetStringArrayAsync(string key, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        if (!all.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw)) return [];

        try
        {
            return JsonSerializer.Deserialize<List<string>>(raw) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public void Invalidate() => cache.Remove(CacheKey);
}
