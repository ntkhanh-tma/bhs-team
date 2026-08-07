using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BhsTeam.Infrastructure.Persistence.Configurations;

public class VacationConfiguration : IEntityTypeConfiguration<Vacation>
{
    public void Configure(EntityTypeBuilder<Vacation> b)
    {
        b.ToTable("Vacations");
        b.HasKey(v => v.Id);

        // The sheet's username|date dedup rule, expressed properly: a PARTIAL
        // unique index. A soft-deleted day is excluded, so it can be re-registered
        // — exactly the behaviour Code.gs had with its 'Deleted' sentinel.
        b.HasIndex(v => new { v.MemberId, v.Date })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false")
            .HasDatabaseName("IX_Vacations_MemberId_Date_Active");

        // Calendar and history pages always query by date range.
        b.HasIndex(v => v.Date);

        b.HasOne(v => v.Member).WithMany(m => m.Vacations)
            .HasForeignKey(v => v.MemberId).OnDelete(DeleteBehavior.Cascade);

        b.HasOne(v => v.VacationType).WithMany(t => t.Vacations)
            .HasForeignKey(v => v.VacationTypeId).OnDelete(DeleteBehavior.Restrict);

        // Admin repositories call IgnoreQueryFilters() to see and restore tombstones.
        b.HasQueryFilter(v => !v.IsDeleted);
    }
}
