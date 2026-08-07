using Npgsql;

namespace BhsTeam.Infrastructure.Persistence;

/// <summary>
/// Neon hands you a <c>postgresql://user:pass@host/db?sslmode=require</c> URI, but
/// Npgsql only accepts key/value form. Rather than make every operator convert it
/// by hand (an easy thing to get subtly wrong), accept either shape.
/// </summary>
public static class NpgsqlConnectionStringHelper
{
    public static string Normalize(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentException("Connection string is empty.", nameof(connectionString));

        var trimmed = connectionString.Trim();
        var isUri = trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
                 || trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase);

        if (!isUri) return trimmed;

        var uri = new Uri(trimmed);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        };

        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = pair.Split('=', 2);
            if (kv.Length != 2) continue;
            var key = Uri.UnescapeDataString(kv[0]);
            var value = Uri.UnescapeDataString(kv[1]);

            switch (key.ToLowerInvariant())
            {
                case "sslmode":
                    builder.SslMode = Enum.Parse<SslMode>(value, ignoreCase: true);
                    break;
                case "channel_binding":
                    // Npgsql has no ChannelBinding keyword; it negotiates SCRAM channel
                    // binding automatically whenever the server offers it under TLS.
                    // Neon's `channel_binding=require` is therefore already satisfied.
                    break;
                case "application_name":
                    builder.ApplicationName = value;
                    break;
            }
        }

        // Neon autosuspends idle compute, so the first connection after a pause is slow.
        builder.Timeout = 15;
        builder.CommandTimeout = 30;
        builder.Pooling = true;
        builder.MaxPoolSize = 20;
        builder.ApplicationName ??= "BhsTeam.Api";

        return builder.ConnectionString;
    }
}
