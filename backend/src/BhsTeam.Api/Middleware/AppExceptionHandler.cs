using BhsTeam.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BhsTeam.Api.Middleware;

/// <summary>
/// Maps domain failures to RFC 9457 ProblemDetails. Anything unexpected becomes a
/// bare 500 — database and stack details never reach the client.
/// </summary>
public class AppExceptionHandler(ILogger<AppExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        var problem = exception switch
        {
            AppException app => new ProblemDetails
            {
                Status = app.StatusCode,
                Title = TitleFor(app.StatusCode),
                Detail = app.Message,
            },
            _ => null,
        };

        if (problem is null)
        {
            logger.LogError(exception, "Unhandled exception on {Path}", context.Request.Path);
            problem = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Server error",
                Detail = "Something went wrong. Please try again.",
            };
        }
        else if (exception is AppException { Errors: { } errors })
        {
            problem.Extensions["errors"] = errors;
        }

        problem.Instance = context.Request.Path;
        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(problem, ct);

        return true;
    }

    private static string TitleFor(int status) => status switch
    {
        400 => "Invalid request",
        401 => "Not signed in",
        403 => "Not allowed",
        404 => "Not found",
        409 => "Conflict",
        422 => "Booking rule violated",
        429 => "Too many requests",
        _ => "Error",
    };
}
