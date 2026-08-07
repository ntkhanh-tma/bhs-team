using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Application.Common;

/// <summary>
/// Persistence seam. Application depends on EF Core's abstractions but never on
/// Npgsql or on the concrete DbContext, so the provider stays an Infrastructure
/// concern. This is the pragmatic alternative to hand-writing a repository
/// interface per entity for 13 entities.
/// </summary>
public interface IAppDbContext
{
    DbSet<Member> Members { get; }
    DbSet<Vacation> Vacations { get; }
    DbSet<VacationType> VacationTypes { get; }
    DbSet<Team> Teams { get; }
    DbSet<Position> Positions { get; }
    DbSet<Origin> Origins { get; }
    DbSet<Country> Countries { get; }
    DbSet<Holiday> Holidays { get; }
    DbSet<ReleasePlan> ReleasePlans { get; }
    DbSet<EventPlan> EventPlans { get; }
    DbSet<AppSetting> AppSettings { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
