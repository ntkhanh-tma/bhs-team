namespace BhsTeam.Domain.Entities;

/// <summary>Column A of the Database sheet.</summary>
public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? ColorHex { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Member> Members { get; set; } = new List<Member>();
}

/// <summary>
/// Column B of the Database sheet — the job title formerly called "Role".
/// The two flags replace hardcoded frontend arrays.
/// </summary>
public class Position
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>False for 'manager' and 'team lead' — was EXCLUDED_ROLES in api.service.ts.</summary>
    public bool IsSelectableInProfile { get; set; } = true;

    /// <summary>True for 'manager' — was the filter in members.component.ts.</summary>
    public bool IsHiddenFromDirectory { get; set; }

    public ICollection<Member> Members { get; set; } = new List<Member>();
}

/// <summary>Column C of the Database sheet ("DC" / Origin).</summary>
public class Origin
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>False for 'tma' — was EXCLUDED_DCS in api.service.ts.</summary>
    public bool IsSelectableInProfile { get; set; } = true;

    public ICollection<Member> Members { get; set; } = new List<Member>();
}

/// <summary>Replaces the hardcoded VALID_TYPES array in both Code.gs and api.service.ts.</summary>
public class VacationType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";

    /// <summary>Single-letter code used by the history PNG export ('V', 'C', 'S').</summary>
    public string Code { get; set; } = "";

    public string ColorHex { get; set; } = "";
    public string ColorDarkHex { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Vacation> Vacations { get; set; } = new List<Vacation>();
}

/// <summary>Drives the holidays page grouping and the sidebar country filter.</summary>
public class Country
{
    public Guid Id { get; set; }
    public string Code { get; set; } = "";      // "VN", "AU"
    public string Name { get; set; } = "";
    public string FlagEmoji { get; set; } = "";

    public ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();
}
