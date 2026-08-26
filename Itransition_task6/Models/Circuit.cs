using System;
using System.Collections.Generic;

namespace Itransition_task6.Models;

public class Circuit
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int GridSize { get; set; } = 20;

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CircuitNode> Nodes { get; set; } = new List<CircuitNode>();

    public ICollection<CircuitWire> Wires { get; set; } = new List<CircuitWire>();
}