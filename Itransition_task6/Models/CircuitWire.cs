namespace Itransition_task6.Models
{
    public class CircuitWire
    {
        public Guid Id { get; set; }

        public Guid CircuitId { get; set; }

        public Circuit Circuit { get; set; } = null!;

        public Guid FromNodeId { get; set; }

        public Guid ToNodeId { get; set; }
    }
}
