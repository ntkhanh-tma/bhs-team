using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BhsTeam.SheetImporter;

/// <summary>
/// Reads the existing Apps Script gateway. Deliberately not the Google Sheets API:
/// the gateway already exposes every read action and its shared secret is already
/// in hand, so the import needs no Google credentials at all.
/// </summary>
public class GatewayClient(HttpClient http, string baseUrl, string secret)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task<T> GetAsync<T>(string action, string? username = null)
    {
        var url = $"{baseUrl}?action={Uri.EscapeDataString(action)}&secret={Uri.EscapeDataString(secret)}";
        if (username is not null) url += $"&username={Uri.EscapeDataString(username)}";

        var response = await http.GetFromJsonAsync<GatewayResponse<T>>(url, Json)
                       ?? throw new InvalidOperationException($"Gateway returned nothing for '{action}'.");

        if (!response.Success)
            throw new InvalidOperationException($"Gateway error on '{action}': {response.Error}");

        return response.Data ?? throw new InvalidOperationException($"Gateway returned no data for '{action}'.");
    }

    public Task<List<RawMember>> GetMembersAsync() => GetAsync<List<RawMember>>("members");
    public Task<RawMember?> GetProfileAsync(string username) => GetAsync<RawMember?>("profile", username);
    public Task<List<RawHoliday>> GetHolidaysAsync() => GetAsync<List<RawHoliday>>("holidays");
    public Task<List<RawVacation>> GetVacationsAsync() => GetAsync<List<RawVacation>>("vacations");
    public Task<RawLookups> GetLookupsAsync() => GetAsync<RawLookups>("database");
    public Task<List<RawRelease>> GetReleasePlansAsync() => GetAsync<List<RawRelease>>("releaseplans");
    public Task<List<RawEvent>> GetEventPlansAsync() => GetAsync<List<RawEvent>>("eventplans");

    private record GatewayResponse<T>(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("data")] T? Data,
        [property: JsonPropertyName("error")] string? Error);
}

public record RawMember(
    string? Id, string? Username, string? Name, string? Department, string? Position,
    string? Dc, string? Ip, string? PublicIp, string? PcName, string? MacAddress,
    string? Email, string? Mobile, string? Birthday);

public record RawVacation(string? Month, string? Username, string? Date, string? Type);
public record RawHoliday(string? Date, string? Name, string? Country);
public record RawRelease(string? Date, string? Release);
public record RawEvent(string? Date, string? Description);
public record RawLookups(List<string> Teams, List<string> Roles, List<string> Dcs);
