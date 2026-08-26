using Itransition_task6.Data;
using Itransition_task6.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Itransition_task6.Controllers;

[ApiController]
[Route("api")]
public class ApiController : ControllerBase
{
    private readonly AppDbContext _db;

    public ApiController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("circuits")]
    public async Task<IActionResult> GetCircuits()
    {
        var circuits = await _db.Circuits
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Description,
                x.GridSize,
                x.CreatedBy,
                x.CreatedAt,
                x.UpdatedAt,
                Nodes = x.Nodes.Count,
                Wires = x.Wires.Count
            })
            .ToListAsync();

        return Ok(circuits);
    }

    [HttpPost("circuits")]
    public async Task<IActionResult> CreateCircuit([FromBody] CreateCircuitRequest request)
    {
        var user = HttpContext.Session.GetString("DisplayName");

        if (string.IsNullOrWhiteSpace(user))
            return Unauthorized();

        var circuit = new Circuit
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? "",
            GridSize = request.GridSize,
            CreatedBy = user,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Circuits.Add(circuit);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            circuit.Id,
            circuit.Name
        });
    }

    [HttpGet("circuits/{id}")]
    public async Task<IActionResult> GetCircuit(Guid id)
    {
        var circuit = await _db.Circuits
            .Include(x => x.Nodes)
            .Include(x => x.Wires)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (circuit == null)
            return NotFound();

        
        var response = new
        {
            id = circuit.Id,
            name = circuit.Name,
            description = circuit.Description,
            gridSize = circuit.GridSize,
            createdBy = circuit.CreatedBy,
            createdAt = circuit.CreatedAt,
            updatedAt = circuit.UpdatedAt,
            nodes = circuit.Nodes.Select(n => new
            {
                id = n.Id,
                circuitId = n.CircuitId,
                type = n.Type.ToString(),
                label = n.Label,
                x = n.X,
                y = n.Y
            }),
            wires = circuit.Wires.Select(w => new
            {
                id = w.Id,
                circuitId = w.CircuitId,
                fromNodeId = w.FromNodeId,
                toNodeId = w.ToNodeId
            })
        };

        return Ok(response);
    }
}

public class CreateCircuitRequest
{
    public string Name { get; set; } = "Untitled Circuit";
    public string? Description { get; set; }
    public int GridSize { get; set; } = 20;
}