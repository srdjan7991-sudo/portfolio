using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Portfolio.Api.Data;

namespace Portfolio.Api.Auth;

internal static class AuthDatabase
{
    public static async Task<IDbContextTransaction> LockWriteAsync(PortfolioDbContext db, CancellationToken ct)
    {
        db.RequireConnection();
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource = N'Portfolio.Auth.Write',
                    @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
                IF @result < 0 THROW 51001, 'Portfolio authentication lock unavailable.', 1;
                """, ct);
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }
}
