namespace Itransition_task6.Services;

public class PresenceService
{
    private readonly object _lock = new();

    private readonly Dictionary<string, int> _names =
        new(StringComparer.OrdinalIgnoreCase);

    public string ReserveName(string requestedName)
    {
        lock (_lock)
        {
            if (!_names.TryGetValue(requestedName, out var count))
            {
                _names[requestedName] = 1;
                return requestedName;
            }

            count++;

            _names[requestedName] = count;

            return $"{requestedName} {count}";
        }
    }

    public void ReleaseName(string displayName)
    {
        lock (_lock)
        {
            var baseName = displayName;

            var lastSpace = displayName.LastIndexOf(' ');

            if (lastSpace > 0 &&
                int.TryParse(displayName[(lastSpace + 1)..], out _))
            {
                baseName = displayName[..lastSpace];
            }

            if (_names.TryGetValue(baseName, out var count))
            {
                if (count <= 1)
                    _names.Remove(baseName);
                else
                    _names[baseName] = count - 1;
            }
        }
    }
}