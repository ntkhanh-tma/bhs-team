namespace BhsTeam.Domain.Entities;

/// <summary>Replaces the 'Holidays' named range (Date | Name | Country).</summary>
public class Holiday
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public string Name { get; set; } = "";

    public Guid? CountryId { get; set; }
    public Country? Country { get; set; }
}

/// <summary>Replaces the 'ReleasePlan' named range (ReleaseDate | Release).</summary>
public class ReleasePlan
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public string Release { get; set; } = "";
}

/// <summary>Replaces the 'EventPlan' named range (EventDate | EventDesc).</summary>
public class EventPlan
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public string Description { get; set; } = "";
}
