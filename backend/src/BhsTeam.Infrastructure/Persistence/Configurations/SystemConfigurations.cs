using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BhsTeam.Infrastructure.Persistence.Configurations;

public class AppSettingConfiguration : IEntityTypeConfiguration<AppSetting>
{
    public void Configure(EntityTypeBuilder<AppSetting> b)
    {
        b.ToTable("AppSettings");
        b.HasKey(s => s.Key);
        b.Property(s => s.Key).HasMaxLength(128);
        b.Property(s => s.Value).IsRequired().HasMaxLength(4000);
        b.Property(s => s.Category).IsRequired().HasMaxLength(64);
        b.Property(s => s.Description).HasMaxLength(512);
        b.Property(s => s.ValueType).HasConversion<string>().HasMaxLength(16);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("AuditLogs");
        b.HasKey(a => a.Id);
        b.Property(a => a.Entity).IsRequired().HasMaxLength(64);
        b.Property(a => a.EntityId).IsRequired().HasMaxLength(64);
        b.Property(a => a.Action).IsRequired().HasMaxLength(32);
        b.Property(a => a.ChangesJson).HasColumnType("jsonb");
        b.HasIndex(a => a.At);
        b.HasIndex(a => new { a.Entity, a.EntityId });
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("RefreshTokens");
        b.HasKey(t => t.Id);
        b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
        b.HasIndex(t => t.TokenHash).IsUnique();
        b.HasIndex(t => t.MemberId);

        b.Ignore(t => t.IsActive);

        b.HasOne(t => t.Member).WithMany()
            .HasForeignKey(t => t.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
