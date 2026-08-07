using BhsTeam.Application.Common;
using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BhsTeam.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Member> Members => Set<Member>();
    public DbSet<Vacation> Vacations => Set<Vacation>();
    public DbSet<VacationType> VacationTypes => Set<VacationType>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<Origin> Origins => Set<Origin>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<ReleasePlan> ReleasePlans => Set<ReleasePlan>();
    public DbSet<EventPlan> EventPlans => Set<EventPlan>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
