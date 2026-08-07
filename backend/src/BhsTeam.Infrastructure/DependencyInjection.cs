using BhsTeam.Application.Common;
using BhsTeam.Infrastructure.Persistence;
using BhsTeam.Infrastructure.Security;
using BhsTeam.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BhsTeam.Infrastructure;

/// <summary>
/// The single seam through which the API composition root touches Infrastructure.
/// Nothing else in BhsTeam.Api should reference this assembly.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("Postgres")
                  ?? throw new InvalidOperationException(
                      "ConnectionStrings:Postgres is not configured. Set it with " +
                      "`dotnet user-secrets set \"ConnectionStrings:Postgres\" \"<value>\"` locally, " +
                      "or as an Azure App Service connection string in production.");

        var connectionString = NpgsqlConnectionStringHelper.Normalize(raw);

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                // Neon autosuspends idle compute and recycles pooled connections;
                // both surface as transient failures.
                npgsql.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
            }));

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddSingleton<IPasswordHasher, PasswordHasherAdapter>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddScoped<ISettingsProvider, SettingsProvider>();
        services.AddScoped<IAuditLogger, AuditLogger>();

        services.AddMemoryCache();

        return services;
    }
}
