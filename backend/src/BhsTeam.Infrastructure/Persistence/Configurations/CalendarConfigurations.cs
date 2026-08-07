using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BhsTeam.Infrastructure.Persistence.Configurations;

public class HolidayConfiguration : IEntityTypeConfiguration<Holiday>
{
    public void Configure(EntityTypeBuilder<Holiday> b)
    {
        b.ToTable("Holidays");
        b.HasKey(h => h.Id);
        b.Property(h => h.Name).IsRequired().HasMaxLength(256);
        b.HasIndex(h => h.Date);

        // Natural key for idempotent re-import.
        b.HasIndex(h => new { h.Date, h.Name, h.CountryId }).IsUnique();

        b.HasOne(h => h.Country).WithMany(c => c.Holidays)
            .HasForeignKey(h => h.CountryId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class ReleasePlanConfiguration : IEntityTypeConfiguration<ReleasePlan>
{
    public void Configure(EntityTypeBuilder<ReleasePlan> b)
    {
        b.ToTable("ReleasePlans");
        b.HasKey(r => r.Id);
        b.Property(r => r.Release).IsRequired().HasMaxLength(256);
        b.HasIndex(r => r.Date);
        b.HasIndex(r => new { r.Date, r.Release }).IsUnique();
    }
}

public class EventPlanConfiguration : IEntityTypeConfiguration<EventPlan>
{
    public void Configure(EntityTypeBuilder<EventPlan> b)
    {
        b.ToTable("EventPlans");
        b.HasKey(e => e.Id);
        b.Property(e => e.Description).IsRequired().HasMaxLength(512);
        b.HasIndex(e => e.Date);
        b.HasIndex(e => new { e.Date, e.Description }).IsUnique();
    }
}
