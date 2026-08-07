namespace BhsTeam.Infrastructure.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "BhsTeam";
    public string Audience { get; set; } = "BhsTeam";

    /// <summary>Never commit this. user-secrets locally, App Service config in production.</summary>
    public string SigningKey { get; set; } = "";

    public int AccessTokenMinutes { get; set; } = 30;
    public int PasswordSetupTokenMinutes { get; set; } = 15;
}
