
using Itransition_task6.Models;
using Microsoft.EntityFrameworkCore;

namespace Itransition_task6.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Circuit> Circuits => Set<Circuit>();

    public DbSet<CircuitNode> CircuitNodes => Set<CircuitNode>();

    public DbSet<CircuitWire> CircuitWires => Set<CircuitWire>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Circuit>()
            .HasKey(x => x.Id);

        modelBuilder.Entity<CircuitNode>()
            .HasKey(x => x.Id);

        modelBuilder.Entity<CircuitWire>()
            .HasKey(x => x.Id);

        modelBuilder.Entity<Circuit>()
            .HasMany(x => x.Nodes)
            .WithOne(x => x.Circuit)
            .HasForeignKey(x => x.CircuitId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Circuit>()
            .HasMany(x => x.Wires)
            .WithOne(x => x.Circuit)
            .HasForeignKey(x => x.CircuitId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Circuit>()
            .Property(x => x.Name)
            .HasMaxLength(150);

        modelBuilder.Entity<Circuit>()
            .Property(x => x.CreatedBy)
            .HasMaxLength(100);

        modelBuilder.Entity<CircuitNode>()
            .Property(x => x.Label)
            .HasMaxLength(100);
    }
}