using Itransition_task6.Data;
using Itransition_task6.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace Itransition_task6.Hubs
{
    public class CircuitHub : Hub
    {
        private readonly AppDbContext _db;

        private static readonly ConcurrentDictionary<string, (string CircuitId, string UserName)> ConnectedUsers = new();

        public CircuitHub(AppDbContext db)
        {
            _db = db;
        }

        public async Task JoinCircuit(string circuitId, string rawUserName)
        {
            if (!Guid.TryParse(circuitId, out var parsedCircuitId))
            {
                throw new HubException("Invalid Circuit ID format.");
            }

            var circuit = await _db.Circuits.FirstOrDefaultAsync(x => x.Id == parsedCircuitId);
            if (circuit == null)
            {
                throw new HubException("Circuit not found.");
            }

            var displayName = string.IsNullOrWhiteSpace(rawUserName) ? "User" : rawUserName.Trim();

            ConnectedUsers[Context.ConnectionId] = (circuitId, displayName);

            await Groups.AddToGroupAsync(Context.ConnectionId, circuitId);
            await BroadcastGroupUsers(circuitId);
        }

        public async Task LeaveCircuit(string circuitId)
        {
            ConnectedUsers.TryRemove(Context.ConnectionId, out _);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, circuitId);
            await BroadcastGroupUsers(circuitId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectedUsers.TryRemove(Context.ConnectionId, out var userInfo))
            {
                await BroadcastGroupUsers(userInfo.CircuitId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        private async Task BroadcastGroupUsers(string circuitId)
        {
            var userList = ConnectedUsers.Values
                .Where(u => u.CircuitId == circuitId)
                .Select(u => u.UserName)
                .Distinct()
                .ToList();

            await Clients.Group(circuitId).SendAsync("UserListUpdated", userList);
        }

        public async Task MoveNode(string circuitId, string nodeId, double x, double y)
        {
            if (!Guid.TryParse(nodeId, out var parsedNodeId)) return;

            var node = await _db.CircuitNodes.FirstOrDefaultAsync(x => x.Id == parsedNodeId);
            if (node == null) return;

            node.X = x;
            node.Y = y;
            await _db.SaveChangesAsync();

            await Clients.OthersInGroup(circuitId).SendAsync("NodeMoved", nodeId, x, y);
        }

        public async Task AddNode(string circuitId, string nodeId, string type, string label, double x, double y)
        {
            if (!Guid.TryParse(circuitId, out var parsedCircuitId)) return;
            if (!Guid.TryParse(nodeId, out var parsedNodeId)) return;

            var circuit = await _db.Circuits.FirstOrDefaultAsync(x => x.Id == parsedCircuitId);
            if (circuit == null) return;

            if (!Enum.TryParse<NodeType>(type, true, out var nodeTypeEnum)) return;

            var node = new CircuitNode
            {
                Id = parsedNodeId,
                CircuitId = circuit.Id,
                Type = nodeTypeEnum,
                Label = label,
                X = x,
                Y = y
            };

            _db.CircuitNodes.Add(node);
            circuit.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var broadcastNode = new
            {
                id = node.Id,
                circuitId = node.CircuitId,
                type = node.Type.ToString(),
                label = node.Label,
                x = node.X,
                y = node.Y
            };

            await Clients.OthersInGroup(circuitId).SendAsync("NodeAdded", broadcastNode);
        }

        public async Task DeleteNode(string circuitId, string nodeId)
        {
            if (!Guid.TryParse(nodeId, out var parsedNodeId)) return;

            var node = await _db.CircuitNodes.FirstOrDefaultAsync(x => x.Id == parsedNodeId);
            if (node == null) return;

            _db.CircuitNodes.Remove(node);

            var wires = await _db.CircuitWires
                .Where(x => x.FromNodeId == node.Id || x.ToNodeId == node.Id)
                .ToListAsync();

            _db.CircuitWires.RemoveRange(wires);
            await _db.SaveChangesAsync();

            await Clients.OthersInGroup(circuitId).SendAsync("NodeDeleted", nodeId);
        }

        public async Task AddWire(string circuitId, string wireId, string fromNodeId, string toNodeId)
        {
            if (!Guid.TryParse(circuitId, out var parsedCircuitId)) return;
            if (!Guid.TryParse(wireId, out var parsedWireId)) return;
            if (!Guid.TryParse(fromNodeId, out var parsedFromId)) return;
            if (!Guid.TryParse(toNodeId, out var parsedToId)) return;

            var wire = new CircuitWire
            {
                Id = parsedWireId,
                CircuitId = parsedCircuitId,
                FromNodeId = parsedFromId,
                ToNodeId = parsedToId
            };

            _db.CircuitWires.Add(wire);
            await _db.SaveChangesAsync();

            await Clients.OthersInGroup(circuitId).SendAsync("WireAdded", wire);
        }

        public async Task DeleteWire(string circuitId, string wireId)
        {
            if (!Guid.TryParse(wireId, out var parsedWireId)) return;

            var wire = await _db.CircuitWires.FirstOrDefaultAsync(x => x.Id == parsedWireId);
            if (wire == null) return;

            _db.CircuitWires.Remove(wire);
            await _db.SaveChangesAsync();

            await Clients.OthersInGroup(circuitId).SendAsync("WireDeleted", wireId);
        }

        public async Task ToggleNodeState(string circuitId, string nodeId, bool value)
        {
            await Clients.OthersInGroup(circuitId).SendAsync("NodeStateToggled", nodeId, value);
        }
    }
}