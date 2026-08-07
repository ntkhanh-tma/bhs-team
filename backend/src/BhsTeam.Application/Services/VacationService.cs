using BhsTeam.Application.Common;
using BhsTeam.Application.Contracts;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Services;

public class VacationService(
    IAppDbContext db,
    ICurrentUser currentUser,
    VacationPolicyService policy)
{
    public async Task<IReadOnlyList<VacationDto>> ListAsync(
        DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var query = db.Vacations
            .Include(v => v.Member)
            .Include(v => v.VacationType)
            .AsNoTracking()
            .AsQueryable();

        if (from is not null) query = query.Where(v => v.Date >= from);
        if (to is not null) query = query.Where(v => v.Date <= to);

        return await query.OrderBy(v => v.Date)
            .Select(v => new VacationDto(
                v.Id, v.MemberId, v.Member!.Username, v.Date,
                v.VacationType!.Name, v.VacationType.Code))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Add/remove in one call, mirroring the old batch write. Removals are applied
    /// first so a member can move a day within the same submission.
    /// </summary>
    public async Task<VacationBatchResult> SubmitAsync(
        Guid memberId, VacationBatchRequest request, bool bypassPolicy, CancellationToken ct = default)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == memberId, ct)
                     ?? throw AppException.NotFound("Member");

        var addDates = request.AddDates.Distinct().OrderBy(d => d).ToList();
        var removeDates = request.RemoveDates.Distinct().ToList();

        if (addDates.Count == 0 && removeDates.Count == 0)
            throw new AppException("Nothing to add or remove.");

        if (!bypassPolicy)
        {
            await policy.EnforceThrottleAsync(member, ct);
            await policy.ValidateAddDatesAsync(addDates, ct);
        }

        if (addDates.Count > 0 &&
            !await db.VacationTypes.AnyAsync(t => t.Id == request.VacationTypeId && t.IsActive, ct))
            throw AppException.NotFound("Vacation type");

        // ── Removals: soft delete, preserving the tombstone ──────────────────
        var removed = 0;
        if (removeDates.Count > 0)
        {
            var toRemove = await db.Vacations
                .Where(v => v.MemberId == memberId && removeDates.Contains(v.Date))
                .ToListAsync(ct);

            foreach (var v in toRemove)
            {
                v.IsDeleted = true;
                v.DeletedAt = DateTimeOffset.UtcNow;
                v.DeletedByMemberId = currentUser.MemberId;
                removed++;
            }
        }

        // ── Additions: skip days already registered ──────────────────────────
        var added = 0;
        var skipped = new List<string>();
        if (addDates.Count > 0)
        {
            var existing = await db.Vacations
                .Where(v => v.MemberId == memberId && addDates.Contains(v.Date))
                .Select(v => v.Date)
                .ToListAsync(ct);

            foreach (var date in addDates)
            {
                if (existing.Contains(date) && !removeDates.Contains(date))
                {
                    skipped.Add($"{date:yyyy-MM-dd} is already registered.");
                    continue;
                }

                db.Vacations.Add(new Vacation
                {
                    Id = Guid.NewGuid(),
                    MemberId = memberId,
                    Date = date,
                    VacationTypeId = request.VacationTypeId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    CreatedByMemberId = currentUser.MemberId,
                });
                added++;
            }
        }

        if (added > 0) member.LastVacationSubmissionAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // The partial unique index is the real guard against a double submit.
            throw AppException.Conflict(
                "One of those days was registered by a concurrent request. Please reload and try again.");
        }

        return new VacationBatchResult(added, removed, skipped);
    }

    public async Task RestoreAsync(Guid vacationId, CancellationToken ct = default)
    {
        var vacation = await db.Vacations.IgnoreQueryFilters()
            .FirstOrDefaultAsync(v => v.Id == vacationId, ct)
            ?? throw AppException.NotFound("Vacation");

        if (!vacation.IsDeleted) return;

        var clash = await db.Vacations
            .AnyAsync(v => v.MemberId == vacation.MemberId && v.Date == vacation.Date, ct);
        if (clash)
            throw AppException.Conflict(
                $"That member already has an active entry on {vacation.Date:yyyy-MM-dd}.");

        vacation.IsDeleted = false;
        vacation.DeletedAt = null;
        vacation.DeletedByMemberId = null;
        await db.SaveChangesAsync(ct);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException?.GetType().Name == "PostgresException" &&
        ex.InnerException.Data.Contains("SqlState") &&
        (string?)ex.InnerException.Data["SqlState"] == "23505";
}
