using BhsTeam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BhsTeam.Infrastructure.Persistence.Configurations;

public class MemberConfiguration : IEntityTypeConfiguration<Member>
{
    public void Configure(EntityTypeBuilder<Member> b)
    {
        b.ToTable("Members");
        b.HasKey(m => m.Id);

        // Usernames are normalised to lowercase in the service layer (the existing
        // sheet convention), so a plain unique index is enough — no citext needed.
        b.Property(m => m.Username).IsRequired().HasMaxLength(64);
        b.HasIndex(m => m.Username).IsUnique();

        b.Property(m => m.Name).IsRequired().HasMaxLength(128);

        b.Property(m => m.Ip).HasMaxLength(64);
        b.Property(m => m.PublicIp).HasMaxLength(64);
        b.Property(m => m.PcName).HasMaxLength(64);
        b.Property(m => m.MacAddress).HasMaxLength(32);
        b.Property(m => m.Email).HasMaxLength(256);
        b.Property(m => m.Mobile).HasMaxLength(32);
        b.Property(m => m.PasswordHash).HasMaxLength(256);

        b.Property(m => m.AccessRole).HasConversion<string>().HasMaxLength(16);

        b.HasOne(m => m.Team).WithMany(t => t.Members)
            .HasForeignKey(m => m.TeamId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(m => m.Position).WithMany(p => p.Members)
            .HasForeignKey(m => m.PositionId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(m => m.Origin).WithMany(o => o.Members)
            .HasForeignKey(m => m.OriginId).OnDelete(DeleteBehavior.SetNull);
    }
}
