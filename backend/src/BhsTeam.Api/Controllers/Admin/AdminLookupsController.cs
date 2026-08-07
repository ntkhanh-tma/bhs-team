using BhsTeam.Api.Security;
using BhsTeam.Application.Contracts;
using BhsTeam.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Controllers.Admin;

/// <summary>
/// The vocabularies behind the profile dropdowns. The Selectable/Hidden flags here
/// are what used to be hardcoded arrays in the Angular bundle.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = CurrentUser.AdminPolicy)]
public class AdminLookupsController(AdminCrudService crud) : ControllerBase
{
    // ── Teams ────────────────────────────────────────────────────────────────
    [HttpGet("teams")]
    public async Task<IEnumerable<object>> ListTeams(CancellationToken ct) =>
        (await crud.ListTeamsAsync(ct)).Select(t => new { t.Id, t.Name, t.ColorHex, t.DisplayOrder, t.IsActive });

    [HttpPost("teams")]
    public async Task<IActionResult> CreateTeam(TeamWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateTeamAsync(r, ct));

    [HttpPut("teams/{id:guid}")]
    public async Task<IActionResult> UpdateTeam(Guid id, TeamWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateTeamAsync(id, r, ct));

    [HttpDelete("teams/{id:guid}")]
    public async Task<IActionResult> DeleteTeam(Guid id, CancellationToken ct)
    {
        await crud.DeleteTeamAsync(id, ct);
        return NoContent();
    }

    // ── Positions (job titles) ───────────────────────────────────────────────
    [HttpGet("positions")]
    public async Task<IEnumerable<object>> ListPositions(CancellationToken ct) =>
        (await crud.ListPositionsAsync(ct)).Select(p => new
        {
            p.Id, p.Name, p.DisplayOrder, p.IsActive, p.IsSelectableInProfile, p.IsHiddenFromDirectory,
        });

    [HttpPost("positions")]
    public async Task<IActionResult> CreatePosition(PositionWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreatePositionAsync(r, ct));

    [HttpPut("positions/{id:guid}")]
    public async Task<IActionResult> UpdatePosition(Guid id, PositionWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdatePositionAsync(id, r, ct));

    [HttpDelete("positions/{id:guid}")]
    public async Task<IActionResult> DeletePosition(Guid id, CancellationToken ct)
    {
        await crud.DeletePositionAsync(id, ct);
        return NoContent();
    }

    // ── Origins (DC) ─────────────────────────────────────────────────────────
    [HttpGet("origins")]
    public async Task<IEnumerable<object>> ListOrigins(CancellationToken ct) =>
        (await crud.ListOriginsAsync(ct)).Select(o => new
        {
            o.Id, o.Name, o.DisplayOrder, o.IsActive, o.IsSelectableInProfile,
        });

    [HttpPost("origins")]
    public async Task<IActionResult> CreateOrigin(OriginWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateOriginAsync(r, ct));

    [HttpPut("origins/{id:guid}")]
    public async Task<IActionResult> UpdateOrigin(Guid id, OriginWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateOriginAsync(id, r, ct));

    [HttpDelete("origins/{id:guid}")]
    public async Task<IActionResult> DeleteOrigin(Guid id, CancellationToken ct)
    {
        await crud.DeleteOriginAsync(id, ct);
        return NoContent();
    }

    // ── Vacation types ───────────────────────────────────────────────────────
    [HttpGet("vacation-types")]
    public async Task<IEnumerable<object>> ListVacationTypes(CancellationToken ct) =>
        (await crud.ListVacationTypesAsync(ct)).Select(t => new
        {
            t.Id, t.Name, t.Code, t.ColorHex, t.ColorDarkHex, t.DisplayOrder, t.IsActive,
        });

    [HttpPost("vacation-types")]
    public async Task<IActionResult> CreateVacationType(VacationTypeWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateVacationTypeAsync(r, ct));

    [HttpPut("vacation-types/{id:guid}")]
    public async Task<IActionResult> UpdateVacationType(Guid id, VacationTypeWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateVacationTypeAsync(id, r, ct));

    [HttpDelete("vacation-types/{id:guid}")]
    public async Task<IActionResult> DeleteVacationType(Guid id, CancellationToken ct)
    {
        await crud.DeleteVacationTypeAsync(id, ct);
        return NoContent();
    }

    // ── Countries ────────────────────────────────────────────────────────────
    [HttpGet("countries")]
    public async Task<IEnumerable<object>> ListCountries(CancellationToken ct) =>
        (await crud.ListCountriesAsync(ct)).Select(c => new { c.Id, c.Code, c.Name, c.FlagEmoji });

    [HttpPost("countries")]
    public async Task<IActionResult> CreateCountry(CountryWriteRequest r, CancellationToken ct) =>
        Ok(await crud.CreateCountryAsync(r, ct));

    [HttpPut("countries/{id:guid}")]
    public async Task<IActionResult> UpdateCountry(Guid id, CountryWriteRequest r, CancellationToken ct) =>
        Ok(await crud.UpdateCountryAsync(id, r, ct));

    [HttpDelete("countries/{id:guid}")]
    public async Task<IActionResult> DeleteCountry(Guid id, CancellationToken ct)
    {
        await crud.DeleteCountryAsync(id, ct);
        return NoContent();
    }
}
