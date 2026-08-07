namespace BhsTeam.Application.Common;

/// <summary>
/// Application-level failure carrying the HTTP status the API should return.
/// The exception handler maps this to ProblemDetails; nothing else leaks.
/// </summary>
public class AppException : Exception
{
    public int StatusCode { get; }
    public IReadOnlyDictionary<string, string[]>? Errors { get; }

    public AppException(string message, int statusCode = 400,
        IReadOnlyDictionary<string, string[]>? errors = null) : base(message)
    {
        StatusCode = statusCode;
        Errors = errors;
    }

    public static AppException NotFound(string what) => new($"{what} was not found.", 404);
    public static AppException Forbidden(string message = "You are not allowed to do that.") => new(message, 403);
    public static AppException Unauthorized(string message = "Invalid credentials.") => new(message, 401);
    public static AppException Conflict(string message) => new(message, 409);

    /// <summary>422 — the request was well-formed but violates a booking rule.</summary>
    public static AppException Unprocessable(string message) => new(message, 422);

    /// <summary>429 — the submit throttle.</summary>
    public static AppException TooManyRequests(string message) => new(message, 429);
}
