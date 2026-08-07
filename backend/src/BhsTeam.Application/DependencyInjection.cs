using BhsTeam.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BhsTeam.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<MemberService>();
        services.AddScoped<VacationService>();
        services.AddScoped<VacationPolicyService>();
        services.AddScoped<CalendarService>();
        services.AddScoped<SettingsAdminService>();
        services.AddScoped<AuthService>();
        services.AddScoped<AdminCrudService>();
        return services;
    }
}
