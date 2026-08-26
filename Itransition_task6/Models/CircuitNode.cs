namespace Itransition_task6.Models
{
    public class CircuitNode
    {
        public Guid Id { get; set; }

        public Guid CircuitId { get; set; }

        public Circuit Circuit { get; set; } = null!;

        public NodeType Type { get; set; }

        public string Label { get; set; } = string.Empty;

        public double X { get; set; }

        public double Y { get; set; }

        public bool InputValue { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
