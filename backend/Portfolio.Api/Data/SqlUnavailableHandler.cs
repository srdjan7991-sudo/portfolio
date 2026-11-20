using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Portfolio.Api.Data;

internal sealed class SqlUnavailableHandler(ILogger<SqlUnavailableHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (cancellationToken.IsCancellationRequested || exception is not (SqlException or
            InvalidOperationException { InnerException: SqlException or DbUpdateException { InnerException: SqlException } } or
            DbUpdateException { InnerException: SqlException }))
            return false;

        logger.LogWarning(exception, "A portfolio database operation failed.");
        await Results.Problem(title: "The portfolio database is temporarily unavailable.", statusCode: 503)
            .ExecuteAsync(context);
        return true;
    }
}
