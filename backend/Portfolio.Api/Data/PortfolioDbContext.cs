using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Portfolio.Api.Auth;
using Portfolio.Api.Sections;

namespace Portfolio.Api.Data;

public sealed class PortfolioDbContext(DbContextOptions<PortfolioDbContext> options) : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<PortfolioSection> Sections => Set<PortfolioSection>();
    internal DbSet<AdminSetup> AdminSetups => Set<AdminSetup>();
    internal DbSet<AuthSession> AuthSessions => Set<AuthSession>();
    internal DbSet<RefreshCredential> RefreshCredentials => Set<RefreshCredential>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<AdminSetup>().ToTable("AdminSetup", table =>
            table.HasCheckConstraint("CK_AdminSetup_Singleton", "[Id] = 1"))
            .Property(item => item.Id).ValueGeneratedNever();
        modelBuilder.Entity<AuthSession>().ToTable("AuthSessions")
            .HasOne<IdentityUser>().WithMany().HasForeignKey(session => session.UserId);
        var refresh = modelBuilder.Entity<RefreshCredential>().ToTable("RefreshCredentials");
        refresh.HasKey(item => item.Hash);
        refresh.Property(item => item.Hash).HasMaxLength(64).IsUnicode(false);

        var section = modelBuilder.Entity<PortfolioSection>();
        section.HasKey(item => item.Key);
        section.Property(item => item.Key).HasMaxLength(80);
        section.Property(item => item.Title).HasMaxLength(160);
    }
}
