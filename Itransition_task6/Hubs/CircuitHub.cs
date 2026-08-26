using Itransition_task6.Data;
using Itransition_task6.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;



namespace Itransition_task6.Hubs;

public class CircuitHub : Hub
{
    private readonly AppDbContext _db;

    public CircuitHub(AppDbContext db)
    {
        _db = db;
    }

    public async Task JoinCircuit(string circuitId)
    {
        var circuit = await _db.Circuits
            .FirstOrDefaultAsync(x => x.Id == Guid.Parse(circuitId));

        if (circuit == null)
            throw new HubException("Circuit not found.");

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            circuitId);

        await Clients.Group(circuitId).SendAsync(
            "UserJoined",
            Context.ConnectionId);
    }

    public async Task LeaveCircuit(string circuitId)
    {
        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            circuitId);

        await Clients.Group(circuitId).SendAsync(
            "UserLeft",
            Context.ConnectionId);
    }

    public async Task MoveNode(
        string circuitId,
        string nodeId,
        double x,
        double y)
    {
        var node = await _db.CircuitNodes
            .FirstOrDefaultAsync(x =>
                x.Id == Guid.Parse(nodeId));

        if (node == null)
            return;

        node.X = x;
        node.Y = y;

        await _db.SaveChangesAsync();

        await Clients.OthersInGroup(circuitId)
            .SendAsync(
                "NodeMoved",
                nodeId,
                x,
                y);
    }

    public async Task AddNode(
        string circuitId,
        string nodeId,
        string type,
        string label,
        double x,
        double y)
    {
        var circuit = await _db.Circuits
            .FirstOrDefaultAsync(x =>
                x.Id == Guid.Parse(circuitId));

        if (circuit == null)
            return;

        var node = new CircuitNode
        {
            Id = Guid.Parse(nodeId),
            CircuitId = circuit.Id,
            Type = Enum.Parse<NodeType>(type),
            Label = label,
            X = x,
            Y = y
        };

        _db.CircuitNodes.Add(node);

        circuit.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await Clients.OthersInGroup(circuitId)
            .SendAsync("NodeAdded", node);
    }

    public async Task DeleteNode(
        string circuitId,
        string nodeId)
    {
        var node = await _db.CircuitNodes
            .FirstOrDefaultAsync(x =>
                x.Id == Guid.Parse(nodeId));

        if (node == null)
            return;

        _db.CircuitNodes.Remove(node);

        var wires = await _db.CircuitWires
            .Where(x =>
                x.FromNodeId == node.Id ||
                x.ToNodeId == node.Id)
            .ToListAsync();

        _db.CircuitWires.RemoveRange(wires);

        await _db.SaveChangesAsync();

        await Clients.OthersInGroup(circuitId)
            .SendAsync(
                "NodeDeleted",
                nodeId);
    }

    public async Task AddWire(
        string circuitId,
        string wireId,
        string fromNodeId,
        string toNodeId)
    {
        var wire = new CircuitWire
        {
            Id = Guid.Parse(wireId),
            CircuitId = Guid.Parse(circuitId),
            FromNodeId = Guid.Parse(fromNodeId),
            ToNodeId = Guid.Parse(toNodeId)
        };

        _db.CircuitWires.Add(wire);

        await _db.SaveChangesAsync();

        await Clients.OthersInGroup(circuitId)
            .SendAsync("WireAdded", wire);
    }

    public async Task DeleteWire(
        string circuitId,
        string wireId)
    {
        var wire = await _db.CircuitWires
            .FirstOrDefaultAsync(x =>
                x.Id == Guid.Parse(wireId));

        if (wire == null)
            return;

        _db.CircuitWires.Remove(wire);

        await _db.SaveChangesAsync();

        await Clients.OthersInGroup(circuitId)
            .SendAsync(
                "WireDeleted",
                wireId);
    }
}