using BhsTeam.Domain;
using BhsTeam.Domain.Entities;
using BhsTeam.Infrastructure.Persistence;
using BhsTeam.SheetImporter;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

// One-time migration from the Google Sheet into PostgreSQL.
//
//   Import everything and make someone an admin:
//     dotnet run --project tools/BhsTeam.SheetImporter -- --promote <username>
//
//   Create the first admin without touching the sheet:
//     dotnet run --project tools/BhsTeam.SheetImporter -- --create-admin <username> --name "Full Name"
//
// Configuration (user-secrets, environment variables, or --Key=value):
//   ConnectionStrings:Postgres   the Neon connection string (URI or key/value form)
//   Gateway:Url                  the Apps Script /exec URL      (import only)
//   Gateway:Secret               the APP_SECRET script property (import only)

var configuration = new ConfigurationBuilder()
    .AddUserSecrets<GatewayClient>(optional: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args)
    .Build();

var promote = GetArg(args, "--promote");
var createAdmin = GetArg(args, "--create-admin");
var displayName = GetArg(args, "--name");

var connectionString = configuration.GetConnectionString("Postgres")
                       ?? Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");

if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("ConnectionStrings:Postgres is not configured.");
    return 1;
}

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseNpgsql(NpgsqlConnectionStringHelper.Normalize(connectionString),
        npgsql => npgsql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null))
    .Options;

await using var db = new AppDbContext(options);

Console.WriteLine("Applying migrations...");
await db.Database.MigrateAsync();

// ── Bootstrap path: create the very first admin, no gateway required ─────────
if (!string.IsNullOrWhiteSpace(createAdmin))
{
    await DbSeeder.SeedAsync(db);

    var username = createAdmin.Trim().ToLowerInvariant();
    var member = await db.Members.FirstOrDefaultAsync(m => m.Username == username);

    if (member is null)
    {
        member = new Member
        {
            Id = Guid.NewGuid(),
            Username = username,
            Name = displayName?.Trim() ?? username,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Members.Add(member);
    }

    member.AccessRole = AccessRole.Admin;
    member.IsActive = true;
    member.MustSetPassword = true;
    member.PasswordHash = null;
    member.UpdatedAt = DateTimeOffset.UtcNow;

    await db.SaveChangesAsync();

    Console.WriteLine(
        $"Admin '{username}' is ready. Sign in with any password to trigger the " +
        "first-login password setup flow.");
    return 0;
}

// ── Import path ──────────────────────────────────────────────────────────────
var gatewayUrl = configuration["Gateway:Url"];
var gatewaySecret = configuration["Gateway:Secret"];

if (string.IsNullOrWhiteSpace(gatewayUrl) || string.IsNullOrWhiteSpace(gatewaySecret))
{
    Console.Error.WriteLine(
        "Gateway:Url and Gateway:Secret are required to import. These are the same values as " +
        "the VACATION_API_URL and GATEWAY_SECRET repo secrets. " +
        "(Use --create-admin to bootstrap without the sheet.)");
    return 1;
}

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
var gateway = new GatewayClient(http, gatewayUrl.TrimEnd('/'), gatewaySecret);

try
{
    await new SheetImportService(db, gateway).RunAsync(promote);
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Import failed: {ex.Message}");
    return 1;
}

static string? GetArg(string[] args, string name)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}
