namespace BhsTeam.Domain;

/// <summary>
/// Permission level. Deliberately NOT called "Role": the sheet's column D "Role"
/// is a free-text job title and lives on <see cref="Entities.Position"/>.
/// </summary>
public enum AccessRole
{
    Member = 0,
    Admin = 1,
}

public enum SettingValueType
{
    String = 0,
    Int = 1,
    Bool = 2,
    Json = 3,
}
