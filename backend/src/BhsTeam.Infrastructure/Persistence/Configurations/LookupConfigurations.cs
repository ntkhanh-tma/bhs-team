using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BhsTeam.Infrastructure.Persistence.Configurations;

public class TeamConfiguration : IEntityTypeConfiguration<Team>
{
    public void Configure(EntityTypeBuilder<Team> b)
    {
        b.ToTable("Teams");
        b.HasKey(t => t.Id);
        b.Property(t => t.Name).IsRequired().HasMaxLength(128);
        b.Property(t => t.ColorHex).HasMaxLength(16);
        b.HasIndex(t => t.Name).IsUnique();
    }
}

public class PositionConfiguration : IEntityTypeConfiguration<Position>
{
    public void Configure(EntityTypeBuilder<Position> b)
    {
        b.ToTable("Positions");
        b.HasKey(p => p.Id);
        b.Property(p => p.Name).IsRequired().HasMaxLength(128);
        b.HasIndex(p => p.Name).IsUnique();
    }
}

public class OriginConfiguration : IEntityTypeConfiguration<Origin>
{
    public void Configure(EntityTypeBuilder<Origin> b)
    {
        b.ToTable("Origins");
        b.HasKey(o => o.Id);
        b.Property(o => o.Name).IsRequired().HasMaxLength(128);
        b.HasIndex(o => o.Name).IsUnique();
    }
}

public class VacationTypeConfiguration : IEntityTypeConfiguration<VacationType>
{
    public void Configure(EntityTypeBuilder<VacationType> b)
    {
        b.ToTable("VacationTypes");
        b.HasKey(t => t.Id);
        b.Property(t => t.Name).IsRequired().HasMaxLength(64);
        b.Property(t => t.Code).IsRequired().HasMaxLength(4);
        b.Property(t => t.ColorHex).HasMaxLength(16);
        b.Property(t => t.ColorDarkHex).HasMaxLength(16);
        b.HasIndex(t => t.Name).IsUnique();
    }
}

public class CountryConfiguration : IEntityTypeConfiguration<Country>
{
    public void Configure(EntityTypeBuilder<Country> b)
    {
        b.ToTable("Countries");
        b.HasKey(c => c.Id);
        b.Property(c => c.Code).IsRequired().HasMaxLength(8);
        b.Property(c => c.Name).IsRequired().HasMaxLength(128);
        b.Property(c => c.FlagEmoji).HasMaxLength(16);
        b.HasIndex(c => c.Code).IsUnique();
    }
}
