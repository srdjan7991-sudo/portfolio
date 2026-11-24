using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Portfolio.Api.Data;

namespace Portfolio.Api.Auth;

internal static class AdminRecovery
{
    public static async Task<int> RunAsync(IServiceProvider services)
    {
        if (Console.IsInputRedirected)
        {
            Console.Error.WriteLine("Administrator recovery requires an interactive terminal.");
            return 1;
        }

        Console.Write("Existing administrator email: ");
        var email = Console.ReadLine()?.Trim();
        if (string.IsNullOrWhiteSpace(email)) return 1;

        var password = ReadPassword("New passphrase (15–128 characters, Escape to cancel): ");
        if (password is null) return 1;
        if (password.Length < AuthSettings.MinimumSignupPasswordLength)
        {
            Console.Error.WriteLine("The passphrase is too short.");
            return 1;
        }
        if (!string.Equals(password, ReadPassword("Confirm passphrase: "), StringComparison.Ordinal))
        {
            Console.Error.WriteLine("The passphrases did not match.");
            return 1;
        }

        try
        {
            if (await ResetAsync(services, email, password))
            {
                Console.WriteLine("Administrator password reset. Existing sessions were revoked.");
                return 0;
            }
            Console.Error.WriteLine("Recovery requires a previously configured administrator and a valid new passphrase.");
        }
        catch (Exception exception)
        {
            services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(AdminRecovery))
                .LogError(exception, "Administrator password recovery failed.");
        }
        return 1;
    }

    internal static async Task<bool> ResetAsync(
        IServiceProvider services, string email, string password, CancellationToken ct = default)
    {
        if (password.Length is < AuthSettings.MinimumSignupPasswordLength or > AuthSettings.MaximumPasswordLength)
            return false;

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PortfolioDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        await using var transaction = await AuthDatabase.LockWriteAsync(db, ct);
        if (!await db.AdminSetups.AnyAsync(ct)) return false;

        var user = await users.FindByEmailAsync(email);
        if (user is null || !await users.IsInRoleAsync(user, AuthSettings.Admin)) return false;

        if (!(await users.RemovePasswordAsync(user)).Succeeded ||
            !(await users.AddPasswordAsync(user, password)).Succeeded ||
            !(await users.ResetAccessFailedCountAsync(user)).Succeeded ||
            !(await users.SetLockoutEndDateAsync(user, null)).Succeeded)
            return false;

        var now = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow();
        await db.AuthSessions.Where(session => session.UserId == user.Id && session.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(session => session.RevokedAt, now), ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private static string? ReadPassword(string prompt)
    {
        Console.Write(prompt);
        var buffer = new char[AuthSettings.MaximumPasswordLength];
        var length = 0;
        try
        {
            while (true)
            {
                var key = Console.ReadKey(intercept: true);
                if (key.Key is ConsoleKey.Enter or ConsoleKey.Escape)
                {
                    Console.WriteLine();
                    return key.Key == ConsoleKey.Enter ? new string(buffer, 0, length) : null;
                }
                if (key.Key == ConsoleKey.Backspace && length > 0)
                    buffer[--length] = '\0';
                else if (!char.IsControl(key.KeyChar))
                {
                    if (length == buffer.Length)
                    {
                        Console.Error.WriteLine("\nThe passphrase exceeds the maximum length.");
                        return null;
                    }
                    buffer[length++] = key.KeyChar;
                }
            }
        }
        finally
        {
            Array.Clear(buffer);
        }
    }
}
