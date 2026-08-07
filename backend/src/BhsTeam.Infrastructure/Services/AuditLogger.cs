using System.Text.Json;
using BhsTeam.Application.Common;
using BhsTeam.Domain.Entities;
using BhsTeam.Infrastructure.Persistence;

namespace BhsTeam.Infrastructure.Services;

/// <summary>
/// Queues an audit row onto the current unit of work. The caller's SaveChangesAsync
/// commits the audit entry in the same transaction as the change it describes.
/// </summary>
public class AuditLogger(AppDbContext db, ICurrentUser currentUser) : IAuditLogger
{
    public Task RecordAsync(
        string entity, string entityId, string action, object? changes, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            At = DateTimeOffset.UtcNow,
            ActorMemberId = currentUser.MemberId,
            Entity = entity,
            EntityId = entityId,
            Action = action,
            ChangesJson = changes is null ? "{}" : JsonSerializer.Serialize(changes),
        });

        return Task.CompletedTask;
    }
}
